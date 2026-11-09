const http = require('http');
const next = require('next');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();
const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'adois-secret-key-fallback-2026';

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Track online users: userId -> Set of socket IDs
  const onlineUsers = new Map();

  io.use((socket, nextMiddleware) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split('; ')
          .find((row) => row.startsWith('adois_token='))
          ?.split('=')[1];

      if (!token) {
        return nextMiddleware(new Error('Autenticação necessária'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.data.user = decoded;
      return nextMiddleware();
    } catch (err) {
      return nextMiddleware(new Error('Sessão inválida'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (!user) return;

    if (!onlineUsers.has(user.userId)) {
      onlineUsers.set(user.userId, new Set());
    }
    onlineUsers.get(user.userId).add(socket.id);

    // 1. Join Private Space Room
    socket.on('join-space', async ({ spaceId }) => {
      try {
        const space = await prisma.space.findUnique({
          where: { id: spaceId },
        });

        if (!space || (space.user1Id !== user.userId && space.user2Id !== user.userId)) {
          socket.emit('error', 'Sem autorização para este espaço.');
          return;
        }

        const roomName = `space:${spaceId}`;
        socket.join(roomName);

        // Notify room that user is online
        socket.to(roomName).emit('partner-presence', {
          userId: user.userId,
          status: 'online',
        });

        // Determine if partner is already online
        const partnerId = space.user1Id === user.userId ? space.user2Id : space.user1Id;
        const isPartnerOnline = partnerId && onlineUsers.has(partnerId) && onlineUsers.get(partnerId).size > 0;

        socket.emit('space-joined', {
          spaceId,
          isPartnerOnline: !!isPartnerOnline,
        });
      } catch (err) {
        console.error('join-space error:', err);
      }
    });

    // 2. Encrypted Message Relay & Persistence
    socket.on('send-message', async (data, callback) => {
      try {
        const { spaceId, ciphertext, iv, ephemeralTtl, replyToId } = data;

        const space = await prisma.space.findUnique({
          where: { id: spaceId },
        });

        if (!space || (space.user1Id !== user.userId && space.user2Id !== user.userId)) {
          if (callback) callback({ error: 'Espaço inválido.' });
          return;
        }

        const expiresAt =
          ephemeralTtl && Number(ephemeralTtl) > 0
            ? new Date(Date.now() + Number(ephemeralTtl) * 1000)
            : null;

        const messageRecord = await prisma.encryptedMessage.create({
          data: {
            spaceId,
            senderId: user.userId,
            ciphertext,
            iv,
            ephemeralTtl: ephemeralTtl ? Number(ephemeralTtl) : null,
            expiresAt,
            status: 'sent',
            replyToId: replyToId || null,
          },
          select: {
            id: true,
            spaceId: true,
            senderId: true,
            ciphertext: true,
            iv: true,
            ephemeralTtl: true,
            expiresAt: true,
            status: true,
            replyToId: true,
            reactions: true,
            createdAt: true,
          },
        });

        const roomName = `space:${spaceId}`;
        // Broadcast to other participant
        socket.to(roomName).emit('receive-message', messageRecord);

        if (callback) {
          callback({ success: true, message: messageRecord });
        }
      } catch (err) {
        console.error('send-message error:', err);
        if (callback) callback({ error: 'Falha no envio da mensagem.' });
      }
    });

    // 3. Typing Indicators
    socket.on('typing', ({ spaceId, isTyping }) => {
      socket.to(`space:${spaceId}`).emit('partner-typing', {
        userId: user.userId,
        isTyping: !!isTyping,
      });
    });

    // 4. Message Read Receipts
    socket.on('mark-read', async ({ spaceId, messageIds }) => {
      try {
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;

        await prisma.encryptedMessage.updateMany({
          where: {
            id: { in: messageIds },
            spaceId,
            senderId: { not: user.userId },
          },
          data: {
            status: 'read',
          },
        });

        socket.to(`space:${spaceId}`).emit('messages-read', {
          messageIds,
          readBy: user.userId,
        });
      } catch (err) {
        console.error('mark-read error:', err);
      }
    });

    // 5. Ephemeral Destroy / Manual Delete
    socket.on('delete-message', async ({ spaceId, messageId }) => {
      try {
        await prisma.encryptedMessage.deleteMany({
          where: {
            id: messageId,
            spaceId,
            senderId: user.userId,
          },
        });

        io.to(`space:${spaceId}`).emit('message-deleted', { messageId });
      } catch (err) {
        console.error('delete-message error:', err);
      }
    });

    // 6. Emoji Reactions
    socket.on('react-message', async ({ spaceId, messageId, emoji }) => {
      try {
        const msg = await prisma.encryptedMessage.findUnique({
          where: { id: messageId },
        });
        if (!msg) return;

        let reactionsMap = {};
        try {
          if (msg.reactions) reactionsMap = JSON.parse(msg.reactions);
        } catch (e) {}

        if (!reactionsMap[emoji]) reactionsMap[emoji] = [];

        // Toggle user reaction
        const idx = reactionsMap[emoji].indexOf(user.userId);
        if (idx > -1) {
          reactionsMap[emoji].splice(idx, 1);
          if (reactionsMap[emoji].length === 0) delete reactionsMap[emoji];
        } else {
          reactionsMap[emoji].push(user.userId);
        }

        const serialized = JSON.stringify(reactionsMap);
        await prisma.encryptedMessage.update({
          where: { id: messageId },
          data: { reactions: serialized },
        });

        io.to(`space:${spaceId}`).emit('message-reaction-updated', {
          messageId,
          reactions: serialized,
        });
      } catch (err) {
        console.error('react-message error:', err);
      }
    });

    // Disconnect handler
    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('space:')) {
          socket.to(room).emit('partner-presence', {
            userId: user.userId,
            status: 'offline',
          });
        }
      }
    });

    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(user.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(user.userId);
        }
      }
    });
  });

  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> ADOIS Server online at http://localhost:${PORT}`);
  });
});

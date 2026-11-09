'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { io, Socket } from 'socket.io-client';
import {
  getLocalKeyPair,
  importPeerPublicKey,
  deriveRoomKey,
  encryptTextMessage,
  decryptTextMessage,
  computeSafetyNumber,
} from '@/lib/crypto';
import {
  Send,
  Lock,
  Clock,
  Trash2,
  CornerUpLeft,
  Search,
  ShieldCheck,
  Check,
  CheckCheck,
  Smile,
  X,
  FileUp,
  FolderLock,
  AlertTriangle,
} from 'lucide-react';

interface DecryptedMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'read';
  ephemeralTtl: number | null;
  expiresAt: string | null;
  replyToId?: string | null;
  reactions?: Record<string, string[]>;
}

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [space, setSpace] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // E2EE state
  const [roomKey, setRoomKey] = useState<CryptoKey | null>(null);
  const [cryptoError, setCryptoError] = useState('');
  const [safetyNumbers, setSafetyNumbers] = useState<string[] | null>(null);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [ephemeralTtl, setEphemeralTtl] = useState<number | null>(null); // seconds
  const [replyingTo, setReplyingTo] = useState<DecryptedMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPartnerTyping]);

  // 1. Initial Load & E2EE Handshake
  useEffect(() => {
    let socket: Socket;

    async function initChat() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/auth');
          return;
        }
        const meData = await meRes.json();
        setCurrentUser(meData.user);

        const currentSpace = meData.space;
        if (!currentSpace || !currentSpace.user2) {
          // Space is not fully connected with two users
          router.push('/dashboard');
          return;
        }

        setSpace(currentSpace);
        const peer =
          currentSpace.user1.id === meData.user.id ? currentSpace.user2 : currentSpace.user1;
        setPartner(peer);

        // Derive E2EE Key
        const localKeyPairData = await getLocalKeyPair();
        if (!localKeyPairData) {
          setCryptoError('Chave privada local não encontrada neste navegador.');
          setLoading(false);
          return;
        }

        if (!peer.publicKey) {
          setCryptoError('O segundo participante ainda não registou uma chave pública.');
          setLoading(false);
          return;
        }

        const peerCryptoKey = await importPeerPublicKey(peer.publicKey);
        const derived = await deriveRoomKey(
          localKeyPairData.keyPair.privateKey,
          peerCryptoKey,
          currentSpace.id
        );
        setRoomKey(derived);

        // Compute Safety Numbers
        if (localKeyPairData.spki && peer.publicKey) {
          const numbers = await computeSafetyNumber(localKeyPairData.spki, peer.publicKey);
          setSafetyNumbers(numbers);
        }

        // Fetch History
        const historyRes = await fetch(`/api/messages/history?spaceId=${currentSpace.id}`);
        const historyData = await historyRes.json();

        if (historyData.messages) {
          const decryptedList: DecryptedMessage[] = [];
          for (const raw of historyData.messages) {
            try {
              const plain = await decryptTextMessage(raw.ciphertext, raw.iv, derived);
              let reactionsObj: Record<string, string[]> = {};
              if (raw.reactions) {
                try {
                  reactionsObj = JSON.parse(raw.reactions);
                } catch (e) {}
              }
              decryptedList.push({
                id: raw.id,
                senderId: raw.senderId,
                text: plain,
                createdAt: raw.createdAt,
                status: raw.status,
                ephemeralTtl: raw.ephemeralTtl,
                expiresAt: raw.expiresAt,
                replyToId: raw.replyToId,
                reactions: reactionsObj,
              });
            } catch (decErr) {
              console.error('Decryption failed for message:', raw.id);
            }
          }
          setMessages(decryptedList);
        }

        // Connect Socket.IO
        socket = io(window.location.origin, {
          transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('join-space', { spaceId: currentSpace.id });
        });

        socket.on('space-joined', ({ isPartnerOnline: pOnline }) => {
          setIsPartnerOnline(pOnline);
        });

        socket.on('partner-presence', ({ status }) => {
          setIsPartnerOnline(status === 'online');
        });

        socket.on('partner-typing', ({ isTyping }) => {
          setIsPartnerTyping(isTyping);
        });

        socket.on('receive-message', async (newMsg) => {
          try {
            const plain = await decryptTextMessage(newMsg.ciphertext, newMsg.iv, derived);
            setMessages((prev) => [
              ...prev,
              {
                id: newMsg.id,
                senderId: newMsg.senderId,
                text: plain,
                createdAt: newMsg.createdAt,
                status: 'read',
                ephemeralTtl: newMsg.ephemeralTtl,
                expiresAt: newMsg.expiresAt,
                replyToId: newMsg.replyToId,
                reactions: {},
              },
            ]);

            // Notify sender that message is read
            socket.emit('mark-read', {
              spaceId: currentSpace.id,
              messageIds: [newMsg.id],
            });
          } catch (e) {
            console.error('Error decrypting incoming message:', e);
          }
        });

        socket.on('messages-read', ({ messageIds }) => {
          setMessages((prev) =>
            prev.map((m) => (messageIds.includes(m.id) ? { ...m, status: 'read' } : m))
          );
        });

        socket.on('message-deleted', ({ messageId }) => {
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        });

        socket.on('message-reaction-updated', ({ messageId, reactions }) => {
          try {
            const parsed = JSON.parse(reactions);
            setMessages((prev) =>
              prev.map((m) => (m.id === messageId ? { ...m, reactions: parsed } : m))
            );
          } catch (e) {}
        });

        setLoading(false);
      } catch (err: any) {
        console.error('Chat init error:', err);
        setCryptoError(err.message || 'Falha ao inicializar chat privado.');
        setLoading(false);
      }
    }

    initChat();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [router]);

  // 2. Typing indicator emitter
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socketRef.current || !space) return;

    socketRef.current.emit('typing', { spaceId: space.id, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { spaceId: space.id, isTyping: false });
    }, 2000);
  };

  // 3. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !roomKey || !space || !socketRef.current) return;

    const messageText = inputText.trim();
    setInputText('');

    try {
      // Encrypt message locally with AES-256-GCM
      const { ciphertext, iv } = await encryptTextMessage(messageText, roomKey);

      socketRef.current.emit(
        'send-message',
        {
          spaceId: space.id,
          ciphertext,
          iv,
          ephemeralTtl: ephemeralTtl || null,
          replyToId: replyingTo?.id || null,
        },
        (res: any) => {
          if (res?.success && res.message) {
            setMessages((prev) => [
              ...prev,
              {
                id: res.message.id,
                senderId: currentUser.id,
                text: messageText,
                createdAt: res.message.createdAt,
                status: 'sent',
                ephemeralTtl: res.message.ephemeralTtl,
                expiresAt: res.message.expiresAt,
                replyToId: replyingTo?.id || null,
                reactions: {},
              },
            ]);
            setReplyingTo(null);
          }
        }
      );
    } catch (err) {
      console.error('Failed to send encrypted message:', err);
    }
  };

  // 4. Delete message
  const handleDeleteMessage = (messageId: string) => {
    if (!socketRef.current || !space) return;
    socketRef.current.emit('delete-message', { spaceId: space.id, messageId });
  };

  // 5. React with emoji
  const handleReact = (messageId: string, emoji: string) => {
    if (!socketRef.current || !space) return;
    socketRef.current.emit('react-message', { spaceId: space.id, messageId, emoji });
  };

  // Filter messages if search is active
  const filteredMessages = searchQuery
    ? messages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-500 font-mono text-xs uppercase tracking-widest">
        A inicializar chaves criptográficas ponta a ponta...
      </div>
    );
  }

  if (cryptoError) {
    return (
      <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
        <Navbar />
        <div className="pt-36 max-w-lg mx-auto px-6 text-center">
          <div className="p-4 border border-red-500/30 bg-red-950/20 text-red-400 text-xs mb-6">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-400" />
            <span className="font-bold uppercase tracking-wider block mb-1">
              Erro de Criptografia
            </span>
            <span>{cryptoError}</span>
          </div>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-white text-black text-xs font-semibold uppercase tracking-widest"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden selection:bg-white selection:text-black">
      {/* 1. TOP BAR */}
      <header className="h-16 border-b border-white/[0.08] bg-black/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="text-xs uppercase tracking-[0.25em] text-gray-400 hover:text-white">
            ← ADOIS
          </Link>
          <span className="text-gray-600">/</span>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-none border border-white/20 bg-[#161616] flex items-center justify-center font-bold text-xs uppercase">
                {partner?.name?.charAt(0)}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black ${
                  isPartnerOnline ? 'bg-green-400' : 'bg-gray-600'
                }`}
                title={isPartnerOnline ? 'Online' : 'Offline'}
              />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-white">
                {partner?.name}
              </div>
              <div className="text-[10px] text-gray-500 font-mono">
                {isPartnerOnline ? 'Conectado agora' : 'Desconectado'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-4">
          {/* Ephemeral Timer Selector */}
          <div className="flex items-center space-x-1 border border-white/10 px-2 py-1 bg-[#0c0c0c] text-[11px] font-mono">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={ephemeralTtl || ''}
              onChange={(e) => setEphemeralTtl(e.target.value ? Number(e.target.value) : null)}
              className="bg-transparent text-gray-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-black text-white">Permanente</option>
              <option value="30" className="bg-black text-white">30 seg</option>
              <option value="300" className="bg-black text-white">5 min</option>
              <option value="3600" className="bg-black text-white">1 hora</option>
              <option value="86400" className="bg-black text-white">24 horas</option>
            </select>
          </div>

          {/* Search Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Pesquisar mensagens"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Safety Number Button */}
          <button
            onClick={() => setShowSafetyModal(true)}
            className="p-2 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Código de Segurança E2EE"
          >
            <ShieldCheck className="w-4 h-4 text-green-400" />
          </button>

          <Link
            href="/space/files"
            className="p-2 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="O Nosso Espaço (Ficheiros)"
          >
            <FolderLock className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* 2. SEARCH BAR DRAWER (If Open) */}
      {showSearch && (
        <div className="p-3 bg-[#0d0d0d] border-b border-white/[0.08] flex items-center space-x-3 px-6">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Pesquisar no histórico decifrado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-white placeholder:text-gray-600 focus:outline-none flex-1 font-sans"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* 3. MESSAGES SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black">
        {/* Security Banner */}
        <div className="max-w-md mx-auto my-6 p-4 border border-white/[0.08] bg-[#0c0c0c] text-center">
          <div className="inline-flex items-center space-x-2 text-[11px] uppercase tracking-widest text-gray-400 font-mono mb-1">
            <Lock className="w-3.5 h-3.5 text-white/70" />
            <span>Comunicação Protegida por E2EE</span>
          </div>
          <p className="text-[11px] text-gray-500 font-light">
            Apenas tu e {partner?.name} possuem as chaves para decifrar estas mensagens. Nem a equipa da
            ADOIS consegue ler este conteúdo.
          </p>
        </div>

        {/* Message Bubble List */}
        {filteredMessages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const repliedMsg = msg.replyToId
            ? messages.find((m) => m.id === msg.replyToId)
            : null;

          return (
            <div
              key={msg.id}
              className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
            >
              {/* Replying quote preview */}
              {repliedMsg && (
                <div
                  className={`text-[10px] text-gray-500 mb-1 max-w-sm truncate border-l-2 pl-2 ${
                    isMe ? 'border-white text-right' : 'border-gray-500 text-left'
                  }`}
                >
                  <span className="font-semibold uppercase tracking-wider">
                    {repliedMsg.senderId === currentUser.id ? 'Tu: ' : `${partner?.name}: `}
                  </span>
                  {repliedMsg.text}
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`relative max-w-md md:max-w-lg p-4 text-sm leading-relaxed transition-all ${
                  isMe
                    ? 'bg-white text-black font-normal'
                    : 'bg-[#1a1a1a] text-white font-light border border-white/[0.06]'
                }`}
              >
                <div>{msg.text}</div>

                {/* Footer metadata: time, ephemeral indicator, read receipt */}
                <div
                  className={`flex items-center justify-end space-x-2 mt-2 text-[10px] font-mono ${
                    isMe ? 'text-gray-600' : 'text-gray-400'
                  }`}
                >
                  {msg.ephemeralTtl && (
                    <span className="flex items-center space-x-1" title="Mensagem temporária">
                      <Clock className="w-3 h-3" />
                      <span>{msg.ephemeralTtl}s</span>
                    </span>
                  )}
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString('pt-PT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isMe && (
                    <span title={msg.status === 'read' ? 'Lida' : 'Enviada'}>
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-black" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </span>
                  )}
                </div>

                {/* Reactions badge */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="absolute -bottom-3 right-2 flex items-center space-x-1 bg-black border border-white/20 px-1.5 py-0.5 rounded-full text-xs">
                    {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                      <span key={emoji} className="flex items-center space-x-0.5">
                        <span>{emoji}</span>
                        {userIds.length > 1 && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            {userIds.length}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions (Reply, React, Delete) - Visible on hover */}
              <div
                className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2 mt-1 text-gray-500 text-xs px-1 ${
                  isMe ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <button
                  onClick={() => setReplyingTo(msg)}
                  className="hover:text-white p-1"
                  title="Responder"
                >
                  <CornerUpLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleReact(msg.id, '❤️')}
                  className="hover:scale-125 transition-transform"
                >
                  ❤️
                </button>
                <button
                  onClick={() => handleReact(msg.id, '👍')}
                  className="hover:scale-125 transition-transform"
                >
                  👍
                </button>
                <button
                  onClick={() => handleReact(msg.id, '🔥')}
                  className="hover:scale-125 transition-transform"
                >
                  🔥
                </button>
                {isMe && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="hover:text-red-400 p-1"
                    title="Apagar mensagem"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Partner Typing Bubble */}
        {isPartnerTyping && (
          <div className="flex items-center space-x-2 text-xs text-gray-400 font-mono py-2">
            <span className="w-2 h-2 rounded-full bg-white animate-bounce" />
            <span>{partner?.name} está a escrever...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. REPLYING BAR (If set) */}
      {replyingTo && (
        <div className="p-2.5 bg-[#111111] border-t border-white/[0.08] flex items-center justify-between px-6 text-xs text-gray-400">
          <div className="flex items-center space-x-2 truncate">
            <CornerUpLeft className="w-3.5 h-3.5 text-white" />
            <span className="uppercase tracking-widest text-white font-semibold">
              A responder a:
            </span>
            <span className="truncate italic">"{replyingTo.text}"</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. BOTTOM INPUT BAR */}
      <footer className="p-4 border-t border-white/[0.08] bg-black shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto flex items-center space-x-3">
          <Link
            href="/space/files"
            className="p-3 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Enviar ficheiro encriptado"
          >
            <FileUp className="w-4 h-4" />
          </Link>

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Mensagem encriptada ponta a ponta..."
            className="flex-1 px-4 py-3 bg-[#0d0d0d] border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-white transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-6 py-3 bg-white text-black font-semibold text-xs uppercase tracking-[0.2em] hover:bg-gray-200 transition-colors flex items-center space-x-2 disabled:opacity-30"
          >
            <span>Enviar</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </footer>

      {/* 6. SAFETY NUMBERS VERIFICATION MODAL */}
      {showSafetyModal && safetyNumbers && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-white/20 bg-black p-8 text-center">
            <div className="w-12 h-12 border border-white/20 mx-auto flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-base font-bold uppercase tracking-widest text-white mb-2">
              Verificação de Identidade
            </h3>
            <p className="text-xs text-gray-400 font-light leading-relaxed mb-6">
              Compara este código de 30 dígitos com o que aparece no ecrã de {partner?.name}. Se os
              números coincidirem, tens a garantia matemática de que a ligação não foi intercetada por
              terceiros.
            </p>

            <div className="grid grid-cols-3 gap-2 font-mono text-xs font-bold text-white mb-8">
              {safetyNumbers.map((group, idx) => (
                <div key={idx} className="p-3 border border-white/10 bg-[#0c0c0c] tracking-widest">
                  {group}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowSafetyModal(false)}
              className="w-full py-3 bg-white text-black font-semibold text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors"
            >
              Confirmar e Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

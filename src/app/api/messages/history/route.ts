import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get('spaceId');

    if (!spaceId) {
      return NextResponse.json({ error: 'ID do espaço obrigatório.' }, { status: 400 });
    }

    // Verify user belongs to space
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space || (space.user1Id !== auth.userId && space.user2Id !== auth.userId)) {
      return NextResponse.json({ error: 'Acesso negado ao espaço.' }, { status: 403 });
    }

    // Purge expired ephemeral messages
    const now = new Date();
    await prisma.encryptedMessage.deleteMany({
      where: {
        spaceId,
        expiresAt: { lte: now },
      },
    });

    // Retrieve encrypted messages (ordered by creation)
    const messages = await prisma.encryptedMessage.findMany({
      where: {
        spaceId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
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

    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    console.error('Messages history error:', err);
    return NextResponse.json({ error: 'Erro ao carregar histórico.' }, { status: 500 });
  }
}

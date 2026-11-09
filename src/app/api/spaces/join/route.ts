import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Código de convite obrigatório.' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Check if user already has an active connected space
    const currentActive = await prisma.space.findFirst({
      where: {
        status: 'active',
        user2Id: { not: null },
        OR: [{ user1Id: auth.userId }, { user2Id: auth.userId }],
      },
    });

    if (currentActive) {
      return NextResponse.json(
        {
          error:
            'A sua conta já está conectada a um espaço privado exclusivo. Encerre a conexão atual antes de entrar noutro espaço.',
        },
        { status: 400 }
      );
    }

    // Atomic transaction to validate and join
    const result = await prisma.$transaction(async (tx) => {
      // Find valid invite
      const invite = await tx.inviteCode.findFirst({
        where: {
          code: cleanCode,
          isUsed: false,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        include: {
          space: true,
        },
      });

      if (!invite) {
        throw new Error('Código de convite inválido, expirado ou revogado.');
      }

      // Check space validity
      const space = invite.space;
      if (space.status !== 'active') {
        throw new Error('O espaço associado a este convite foi encerrado.');
      }

      // Check: creator cannot join their own space
      if (space.user1Id === auth.userId) {
        throw new Error('Não é possível entrar no seu próprio espaço de convite.');
      }

      // STRICT ONLY TWO CHECK: user2 must be null
      if (space.user2Id !== null) {
        throw new Error('Este espaço já atingiu a capacidade máxima de dois participantes.');
      }

      // Associate user2
      const updatedSpace = await tx.space.update({
        where: { id: space.id },
        data: {
          user2Id: auth.userId,
        },
        include: {
          user1: { select: { id: true, name: true, email: true, publicKey: true } },
          user2: { select: { id: true, name: true, email: true, publicKey: true } },
        },
      });

      // Mark invite as used
      await tx.inviteCode.update({
        where: { id: invite.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          eventType: 'SPACE_JOIN',
          userId: auth.userId,
          metadata: JSON.stringify({ spaceId: space.id, code: cleanCode }),
        },
      });

      return updatedSpace;
    });

    return NextResponse.json({
      success: true,
      space: result,
      message: 'Conexão estabelecida com sucesso. Apenas dois participantes.',
    });
  } catch (err: any) {
    console.error('Space join error:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao processar código de convite.' },
      { status: 400 }
    );
  }
}

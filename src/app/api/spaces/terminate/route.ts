import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { spaceId } = await req.json();
    if (!spaceId) {
      return NextResponse.json({ error: 'ID do espaço obrigatório.' }, { status: 400 });
    }

    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space || (space.user1Id !== auth.userId && space.user2Id !== auth.userId)) {
      return NextResponse.json({ error: 'Espaço não encontrado ou sem permissão.' }, { status: 403 });
    }

    // Update space to terminated and revoke all invites
    await prisma.$transaction([
      prisma.space.update({
        where: { id: spaceId },
        data: { status: 'terminated' },
      }),
      prisma.inviteCode.updateMany({
        where: { spaceId, isUsed: false },
        data: { isRevoked: true },
      }),
      prisma.auditLog.create({
        data: {
          eventType: 'SPACE_TERMINATED',
          userId: auth.userId,
          metadata: JSON.stringify({ spaceId }),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Conexão privada encerrada com sucesso.',
    });
  } catch (err: any) {
    console.error('Terminate space error:', err);
    return NextResponse.json({ error: 'Erro ao encerrar conexão.' }, { status: 500 });
  }
}

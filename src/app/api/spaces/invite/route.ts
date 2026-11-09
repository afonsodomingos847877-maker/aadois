import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function generateSecureInviteCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let part1 = '';
  let part2 = '';
  const randomBytes = crypto.randomBytes(8);
  for (let i = 0; i < 4; i++) {
    part1 += chars[randomBytes[i] % chars.length];
    part2 += chars[randomBytes[i + 4] % chars.length];
  }
  return `AD-${part1}-${part2}`;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { spaceId, action } = await req.json();
    if (!spaceId) {
      return NextResponse.json({ error: 'ID do espaço obrigatório.' }, { status: 400 });
    }

    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space || (space.user1Id !== auth.userId && space.user2Id !== auth.userId)) {
      return NextResponse.json({ error: 'Espaço não encontrado.' }, { status: 403 });
    }

    if (action === 'revoke') {
      await prisma.inviteCode.updateMany({
        where: { spaceId, isUsed: false },
        data: { isRevoked: true },
      });
      return NextResponse.json({ success: true, message: 'Códigos anteriores revogados.' });
    }

    // Default action: generate new code (revoking older active codes)
    await prisma.inviteCode.updateMany({
      where: { spaceId, isUsed: false },
      data: { isRevoked: true },
    });

    const newCode = generateSecureInviteCode();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const invite = await prisma.inviteCode.create({
      data: {
        spaceId,
        creatorId: auth.userId,
        code: newCode,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      code: invite.code,
      expiresAt: invite.expiresAt,
      message: 'Novo código gerado com sucesso.',
    });
  } catch (err: any) {
    console.error('Invite generation error:', err);
    return NextResponse.json({ error: 'Erro ao gerar código.' }, { status: 500 });
  }
}

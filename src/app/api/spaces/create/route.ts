import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function generateSecureInviteCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous 0, O, 1, I
  let part1 = '';
  let part2 = '';
  const randomBytes = crypto.randomBytes(8);
  for (let i = 0; i < 4; i++) {
    part1 += chars[randomBytes[i] % chars.length];
    part2 += chars[randomBytes[i + 4] % chars.length];
  }
  return `AD-${part1}-${part2}`;
}

export async function POST() {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Check if user already has an active space
    const existingSpace = await prisma.space.findFirst({
      where: {
        status: 'active',
        OR: [{ user1Id: auth.userId }, { user2Id: auth.userId }],
      },
      include: {
        user1: { select: { id: true, name: true, email: true, publicKey: true } },
        user2: { select: { id: true, name: true, email: true, publicKey: true } },
        invites: {
          where: { isUsed: false, isRevoked: false, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existingSpace) {
      return NextResponse.json({
        success: true,
        space: existingSpace,
        message: 'Espaço existente recuperado.',
      });
    }

    // Create space and invite code atomically
    const code = generateSecureInviteCode();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h validity

    const newSpace = await prisma.space.create({
      data: {
        user1Id: auth.userId,
        name: 'Espaço Privado ADOIS',
        status: 'active',
        invites: {
          create: {
            creatorId: auth.userId,
            code,
            expiresAt,
          },
        },
      },
      include: {
        user1: { select: { id: true, name: true, email: true, publicKey: true } },
        user2: { select: { id: true, name: true, email: true, publicKey: true } },
        invites: {
          where: { isUsed: false, isRevoked: false },
          take: 1,
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        eventType: 'SPACE_CREATE',
        userId: auth.userId,
        metadata: JSON.stringify({ spaceId: newSpace.id, code }),
      },
    });

    return NextResponse.json({
      success: true,
      space: newSpace,
      code,
      message: 'Espaço privado criado com sucesso.',
    });
  } catch (err: any) {
    console.error('Space creation error:', err);
    return NextResponse.json({ error: 'Erro ao criar espaço privado.' }, { status: 500 });
  }
}

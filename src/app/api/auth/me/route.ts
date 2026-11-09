import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      name: true,
      publicKey: true,
      isAdmin: true,
      createdAt: true,
      devices: {
        where: { isRevoked: false },
        orderBy: { lastActive: 'desc' },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
  }

  // Find active space for this user
  const space = await prisma.space.findFirst({
    where: {
      status: 'active',
      OR: [{ user1Id: user.id }, { user2Id: user.id }],
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

  return NextResponse.json({
    user,
    space: space || null,
  });
}

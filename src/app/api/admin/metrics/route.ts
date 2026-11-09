import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth || !auth.isAdmin) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    // 1. Metric: Total registered users
    const totalUsers = await prisma.user.count();

    // 2. Metric: Spaces metrics
    const totalSpaces = await prisma.space.count();
    const activeConnectedSpaces = await prisma.space.count({
      where: { status: 'active', user2Id: { not: null } },
    });
    const pendingSpaces = await prisma.space.count({
      where: { status: 'active', user2Id: null },
    });

    // 3. Metric: Encrypted messages count (NEVER returns ciphertext)
    const totalEncryptedMessages = await prisma.encryptedMessage.count();

    // 4. Metric: Encrypted storage used
    const filesAgg = await prisma.encryptedFile.aggregate({
      _sum: { sizeBytes: true },
      _count: { id: true },
    });
    const totalStorageBytes = filesAgg._sum.sizeBytes || 0;
    const totalFilesCount = filesAgg._count.id || 0;

    // 5. Metric: Active devices count
    const activeDevices = await prisma.device.count({
      where: { isRevoked: false },
    });

    // 6. Recent Audit Logs (Security Telemetry)
    const recentAuditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { email: true } },
      },
    });

    // 7. Spaces list (metadata only: IDs, created date, connection status - NO PRIVATE DATA)
    const spacesSummary = await prisma.space.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            messages: true,
            files: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalUsers,
        totalSpaces,
        activeConnectedSpaces,
        pendingSpaces,
        totalEncryptedMessages,
        totalFilesCount,
        totalStorageBytes,
        activeDevices,
        systemHealth: 'OPERACIONAL',
        encryptionStatus: 'ATIVO (AES-256-GCM / ECDH P-256 Zero-Knowledge)',
      },
      auditLogs: recentAuditLogs,
      spacesSummary,
    });
  } catch (err: any) {
    console.error('Admin metrics error:', err);
    return NextResponse.json({ error: 'Erro ao recolher telemetria.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { spaceId: string } }
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { spaceId } = params;
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space || (space.user1Id !== auth.userId && space.user2Id !== auth.userId)) {
      return NextResponse.json({ error: 'Acesso negado ao espaço.' }, { status: 403 });
    }

    const files = await prisma.encryptedFile.findMany({
      where: { spaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        spaceId: true,
        senderId: true,
        fileType: true,
        mimeType: true,
        sizeBytes: true,
        cloudinaryUrl: true,
        iv: true,
        fileNameCiphertext: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, files });
  } catch (err: any) {
    console.error('List files error:', err);
    return NextResponse.json({ error: 'Erro ao listar ficheiros.' }, { status: 500 });
  }
}

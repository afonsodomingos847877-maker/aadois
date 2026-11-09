import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const fileId = params.id;
    const fileRecord = await prisma.encryptedFile.findUnique({
      where: { id: fileId },
      include: { space: true },
    });

    if (!fileRecord) {
      return NextResponse.json({ error: 'Ficheiro não encontrado' }, { status: 404 });
    }

    // Verify user is in space
    if (fileRecord.space.user1Id !== auth.userId && fileRecord.space.user2Id !== auth.userId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Fetch the encrypted blob from Cloudinary
    const cloudResponse = await fetch(fileRecord.cloudinaryUrl);
    if (!cloudResponse.ok) {
      throw new Error('Falha ao recuperar ficheiro do Cloudinary');
    }

    const arrayBuffer = await cloudResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': buffer.length.toString(),
        'X-Encrypted-IV': fileRecord.iv,
        'X-File-Mime': fileRecord.mimeType,
      },
    });
  } catch (err: any) {
    console.error('Download error:', err);
    return NextResponse.json({ error: 'Erro ao descarregar ficheiro.' }, { status: 500 });
  }
}

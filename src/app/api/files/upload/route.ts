import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadEncryptedBufferToCloudinary } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    const spaceId = formData.get('spaceId') as string;
    const fileType = (formData.get('fileType') as string) || 'document';
    const mimeType = (formData.get('mimeType') as string) || 'application/octet-stream';
    const iv = formData.get('iv') as string;
    const fileNameCiphertext = (formData.get('fileNameCiphertext') as string) || '';

    if (!file || !spaceId || !iv) {
      return NextResponse.json({ error: 'Dados de upload incompletos.' }, { status: 400 });
    }

    // Verify user belongs to space
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space || (space.user1Id !== auth.userId && space.user2Id !== auth.userId)) {
      return NextResponse.json({ error: 'Acesso negado ao espaço.' }, { status: 403 });
    }

    // Read encrypted binary payload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload encrypted raw blob to Cloudinary
    const cloudinaryUpload = await uploadEncryptedBufferToCloudinary(buffer);

    // Record in database
    const encryptedFile = await prisma.encryptedFile.create({
      data: {
        spaceId,
        senderId: auth.userId,
        fileType,
        mimeType,
        sizeBytes: buffer.length,
        cloudinaryUrl: cloudinaryUpload.secureUrl,
        cloudinaryPublicId: cloudinaryUpload.publicId,
        iv,
        fileNameCiphertext,
      },
    });

    return NextResponse.json({
      success: true,
      file: encryptedFile,
      message: 'Ficheiro cifrado alojado com sucesso no Cloudinary.',
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json({ error: 'Erro ao processar upload.' }, { status: 500 });
  }
}

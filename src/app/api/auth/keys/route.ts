import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { publicKey } = await req.json();
  if (!publicKey || typeof publicKey !== 'string') {
    return NextResponse.json({ error: 'Chave pública inválida' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data: { publicKey },
  });

  return NextResponse.json({ success: true, message: 'Chave pública E2EE atualizada com sucesso.' });
}

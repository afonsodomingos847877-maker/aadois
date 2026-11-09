import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, comparePassword, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'A palavra-passe atual e a nova palavra-passe são obrigatórias.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'A nova palavra-passe deve conter pelo menos 8 caracteres.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'A palavra-passe atual está incorreta.' }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: auth.userId },
      data: { passwordHash: newHash },
    });

    await prisma.auditLog.create({
      data: {
        eventType: 'PASSWORD_CHANGED',
        userId: auth.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Palavra-passe alterada com sucesso.',
    });
  } catch (err: any) {
    console.error('Password change error:', err);
    return NextResponse.json(
      { error: 'Erro ao processar alteração de palavra-passe.' },
      { status: 500 }
    );
  }
}


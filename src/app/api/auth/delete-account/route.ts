import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, comparePassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Confirma a palavra-passe para eliminar a conta.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Palavra-passe incorreta.' }, { status: 400 });
    }

    // Cascade delete user data
    await prisma.user.delete({
      where: { id: auth.userId },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Conta eliminada com sucesso.',
    });

    response.cookies.set({
      name: 'adois_token',
      value: '',
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (err: any) {
    console.error('Delete account error:', err);
    return NextResponse.json(
      { error: 'Erro ao processar eliminação da conta.' },
      { status: 500 }
    );
  }
}

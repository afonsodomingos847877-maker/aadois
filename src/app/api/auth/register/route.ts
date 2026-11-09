import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, publicKey } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, palavra-passe e nome são obrigatórios.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A palavra-passe deve conter pelo menos 8 caracteres.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este endereço de email já se encontra registado.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userAgent = req.headers.get('user-agent') || 'Dispositivo desconhecido';
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // First user in database can optionally be admin for testing, or standard user
    const totalUsers = await prisma.user.count();
    const isAdmin = totalUsers === 0;

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name.trim(),
        publicKey: publicKey || null,
        isAdmin,
        devices: {
          create: {
            deviceName: userAgent.includes('Mobile') ? 'Smartphone' : 'Computador',
            userAgent,
            ipAddress,
          },
        },
        auditLogs: {
          create: {
            eventType: 'REGISTER',
            ipAddress,
            metadata: JSON.stringify({ userAgent }),
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        publicKey: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
    });

    const response = NextResponse.json(
      { success: true, user, message: 'Conta criada com sucesso.' },
      { status: 201 }
    );

    response.cookies.set({
      name: 'adois_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error('Register error:', err);
    return NextResponse.json(
      { error: 'Erro interno ao processar registo.' },
      { status: 500 }
    );
  }
}

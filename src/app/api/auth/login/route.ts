import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, publicKey } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e palavra-passe são obrigatórios.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { devices: true },
    });

    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Dispositivo desconhecido';

    if (!user) {
      await prisma.auditLog.create({
        data: {
          eventType: 'FAILED_LOGIN',
          ipAddress,
          metadata: JSON.stringify({ attemptedEmail: email, reason: 'Utilizador não encontrado' }),
        },
      });
      return NextResponse.json(
        { error: 'Credenciais de acesso inválidas.' },
        { status: 401 }
      );
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      await prisma.auditLog.create({
        data: {
          eventType: 'FAILED_LOGIN',
          userId: user.id,
          ipAddress,
          metadata: JSON.stringify({ reason: 'Palavra-passe incorreta' }),
        },
      });
      return NextResponse.json(
        { error: 'Credenciais de acesso inválidas.' },
        { status: 401 }
      );
    }

    // Check device and record/update
    const existingDevice = user.devices.find((d) => d.userAgent === userAgent && !d.isRevoked);
    if (existingDevice) {
      await prisma.device.update({
        where: { id: existingDevice.id },
        data: { lastActive: new Date(), ipAddress },
      });
    } else {
      await prisma.device.create({
        data: {
          userId: user.id,
          deviceName: userAgent.includes('Mobile') ? 'Smartphone' : 'Computador',
          userAgent,
          ipAddress,
        },
      });
    }

    // Update public key if provided and not set or changed
    if (publicKey && publicKey !== user.publicKey) {
      await prisma.user.update({
        where: { id: user.id },
        data: { publicKey },
      });
    }

    await prisma.auditLog.create({
      data: {
        eventType: 'LOGIN',
        userId: user.id,
        ipAddress,
        metadata: JSON.stringify({ userAgent }),
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        publicKey: publicKey || user.publicKey,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
    });

    response.cookies.set({
      name: 'adois_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Erro interno ao processar login.' },
      { status: 500 }
    );
  }
}

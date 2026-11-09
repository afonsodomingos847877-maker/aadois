import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'adois-secret-key-fallback-2026';
const TOKEN_EXPIRY = '30d';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function getAuthUser(): Promise<(TokenPayload & { id: string }) | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('adois_token')?.value;

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    // Check user exists in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, isAdmin: true },
    });

    if (!user) return null;

    return {
      userId: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
    };
  } catch (err) {
    return null;
  }
}

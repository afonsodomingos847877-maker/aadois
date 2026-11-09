import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Sessão encerrada.' });
  response.cookies.set({
    name: 'adois_token',
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}

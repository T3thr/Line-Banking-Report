// src/app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD; // รหัสผ่านจาก .env

  if (password === adminPassword) {
    // ตั้งค่า session
    const res = NextResponse.json({ status: 'success' });
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1); // 1 year expiration
    res.cookies.set('admin_session', 'true', { path: '/', expires });
    return res;
  }

  return NextResponse.json({ status: 'error' }, { status: 401 });
}

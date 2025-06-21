// src/app/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      // Redirect to the dashboard after successful login
      router.push('/');
    } else {
      alert('รหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <form onSubmit={handleLogin} className="bg-card p-6 rounded shadow-md">
        <h2 className="text-2xl mb-4">เข้าสู่ระบบ Admin</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="รหัสผ่าน"
          className="border p-2 rounded mb-4 w-full"
          required
        />
        <button type="submit" className="bg-primary text-primary-foreground p-2 rounded">
          เข้าสู่ระบบ
        </button>
      </form>
    </div>
  );
}
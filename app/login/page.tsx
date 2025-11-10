'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'

export default function LoginPage() {
    useAuthRedirect(false) // ❌ ไม่ต้องเช็ค login ในหน้านี้
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: any) => {
    e.preventDefault()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    else router.push('/')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-md"
      >
        <h1 className="text-2xl font-bold text-center text-blue-600 mb-6">เข้าสู่ระบบ</h1>
        {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">อีเมล</label>
          <input
            type="email"
            className="w-full border rounded-md p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">รหัสผ่าน</label>
          <input
            type="password"
            className="w-full border rounded-md p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
        >
          เข้าสู่ระบบ
        </button>
      </form>
    </div>
  )
}

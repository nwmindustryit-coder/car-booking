import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json()
  const { email, password, role, department } = body

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // ✅ ไม่ต้องยืนยันอีเมล
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // เพิ่มโปรไฟล์พร้อม role
  await supabaseAdmin.from('profiles').insert({ id: data.user.id, role, department, })

  return NextResponse.json({ message: 'User created', id: data.user.id })
}

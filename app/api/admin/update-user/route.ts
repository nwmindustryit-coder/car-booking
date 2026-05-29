import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { userSchema } from '@/lib/schemas'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ใช้ service role key
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, email, password, role, department } = body

    // ✅ Server-side Validation
    const validation = userSchema.safeParse({ email, password, role, department })
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }

    // ✅ อัปเดตใน auth.users (รหัสผ่าน + email)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      email,
      password: password || undefined,
    })

    if (authError) throw authError

    // ✅ อัปเดตในตาราง profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email, role, department })
      .eq('id', id)

    if (profileError) throw profileError

    return NextResponse.json({ message: 'User updated successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

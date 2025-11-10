import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ใช้ service role key
)

export async function POST(req: Request) {
  try {
    const { id, email, password, role } = await req.json()

    // ✅ อัปเดตใน auth.users (รหัสผ่าน + email)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      email,
      password: password || undefined,
    })

    if (authError) throw authError

    // ✅ อัปเดตในตาราง profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email, role })
      .eq('id', id)

    if (profileError) throw profileError

    return NextResponse.json({ message: 'User updated successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

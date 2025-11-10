import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ ใช้ service role key
)

export async function GET() {
  try {
    // ✅ ดึง users ทั้งหมดจากระบบ auth
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) throw error

    // ✅ ดึงข้อมูล role จากตาราง profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')

    if (profileError) throw profileError

    // ✅ รวมข้อมูลจากทั้งสองที่เข้าด้วยกัน
    const users = data.users.map((u) => {
      const profile = profiles?.find((p) => p.id === u.id)
      return {
        id: u.id,
        email: u.email,
        role: profile?.role || u.user_metadata?.role || 'user',
      }
    })

    return NextResponse.json(users)
  } catch (err: any) {
    console.error('List users error:', err)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

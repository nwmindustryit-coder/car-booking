import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // 1. ลบจากตารางอื่นๆ ที่อ้างอิง user_id (ถ้ามีข้อจำกัด Foreign Key)
    // หมายเหตุ: หากตั้งค่า ON DELETE CASCADE ใน Database แล้ว ขั้นตอนนี้อาจไม่จำเป็น
    // แต่เพื่อความชัวร์ เราจะลบข้อมูลสำคัญออกก่อน
    
    // ลบโปรไฟล์
    await supabaseAdmin.from('profiles').delete().eq('id', id)
    
    // ลบแชท
    await supabaseAdmin.from('internal_messages').delete().eq('user_id', id)
    await supabaseAdmin.from('internal_messages').delete().eq('recipient_id', id)

    // 2. ลบจาก Supabase Auth (ลบบัญชีผู้ใช้ออกจริง ๆ)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (authError) {
      // หากลบใน Auth ไม่ได้ อาจเพราะยังมีข้อมูลผูกพันในตารางอื่นที่เราไม่ได้ลบ
      return NextResponse.json({ error: `Auth Error: ${authError.message}` }, { status: 400 })
    }

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (err: any) {
    console.error('Delete user error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

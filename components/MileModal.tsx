'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function MileModal({ bookingId, onClose }: { bookingId: number, onClose: () => void }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const handleSave = async () => {
    if (!start || !end) return alert('กรอกเลขไมล์ให้ครบ')
    await supabase.from('miles').insert({
      booking_id: bookingId,
      start_mile: Number(start),
      end_mile: Number(end),
    })
    alert('บันทึกเลขไมล์เรียบร้อย')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-96 space-y-3">
        <h2 className="text-lg font-bold text-blue-700">บันทึกเลขไมล์</h2>
        <input
          placeholder="เลขไมล์เริ่มต้น"
          className="w-full border p-2 rounded-md"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <input
          placeholder="เลขไมล์สิ้นสุด"
          className="w-full border p-2 rounded-md"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded-md">บันทึก</button>
        <button onClick={onClose} className="w-full mt-2 border py-2 rounded-md">ยกเลิก</button>
      </div>
    </div>
  )
}

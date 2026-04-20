'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function AdminCars() {
  const [cars, setCars] = useState<any[]>([])
  const [plate, setPlate] = useState('')
  const [brand, setBrand] = useState('')

  const loadCars = async () => {
    const { data, error } = await supabase.from('cars').select('*').order('id')
    if (error) console.error(error)
    setCars(data || [])
  }

  const addCar = async (e: any) => {
    e.preventDefault()
    if (!plate) return alert('กรุณากรอกทะเบียนรถ')
    const { error } = await supabase.from('cars').insert([{ plate, brand }])
    if (error) alert(error.message)
    else {
      alert('เพิ่มรถสำเร็จ')
      setPlate('')
      setBrand('')
      loadCars()
    }
  }

  const deleteCar = async (id: number) => {
    if (!confirm('ต้องการลบรถคันนี้หรือไม่?')) return
    const { error } = await supabase.from('cars').delete().eq('id', id)
    if (error) alert(error.message)
    else loadCars()
  }

  useEffect(() => { loadCars() }, [])

  return (
    <>
      <Navbar />
      <main className="p-6 max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-blue-700">จัดการรถ</h1>
        <Card>
          <CardHeader><CardTitle>เพิ่มรถใหม่</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addCar} className="flex gap-2 flex-wrap">
              <Input placeholder="ทะเบียนรถ" value={plate} onChange={(e) => setPlate(e.target.value)} />
              <Input placeholder="ยี่ห้อ/รุ่น" value={brand} onChange={(e) => setBrand(e.target.value)} />
              <Button type="submit">เพิ่มรถ</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>รายการรถทั้งหมด</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="bg-blue-100"><th>ทะเบียน</th><th>ยี่ห้อ/รุ่น</th><th></th></tr></thead>
              <tbody>
                {cars.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td>{c.plate}</td>
                    <td>{c.brand}</td>
                    <td className="text-right">
                      <Button variant="destructive" onClick={() => deleteCar(c.id)}>ลบ</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </>
  )
}

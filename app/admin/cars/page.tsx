'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Car, Plus, Trash2, Tag, Activity, ShieldCheck } from 'lucide-react'

export default function AdminCars() {
  const [cars, setCars] = useState<any[]>([])
  const [plate, setPlate] = useState('')
  const [brand, setBrand] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadCars = async () => {
    setIsLoading(true)
    const { data, error } = await supabase.from('cars').select('*').order('id', { ascending: false })
    if (error) console.error(error)
    setCars(data || [])
    setIsLoading(false)
  }

  const addCar = async (e: any) => {
    e.preventDefault()
    if (!plate) return alert('กรุณากรอกทะเบียนรถ')
    const { error } = await supabase.from('cars').insert([{ plate, brand }])
    if (error) alert(error.message)
    else {
      setPlate('')
      setBrand('')
      loadCars()
    }
  }

  const deleteCar = async (id: number) => {
    if (!confirm('ต้องการลบข้อมูลรถคันนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return
    const { error } = await supabase.from('cars').delete().eq('id', id)
    if (error) alert(error.message)
    else loadCars()
  }

  useEffect(() => { loadCars() }, [])

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <Navbar />
      <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 mt-4">
        
        {/* ✅ Header Section */}
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="bg-blue-600 p-3 rounded-xl shadow-sm">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">จัดการข้อมูลรถยนต์</h1>
            <p className="text-slate-500 text-sm mt-1">เพิ่ม แก้ไข และลบรายชื่อรถยนต์ส่วนกลางในระบบ</p>
          </div>
        </div>

        {/* ✅ ฟอร์มเพิ่มรถใหม่ */}
        <Card className="border-none shadow-md bg-white overflow-hidden rounded-2xl">
          <div className="bg-blue-50/50 border-b px-6 py-4">
            <CardTitle className="text-blue-800 flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5" /> เพิ่มรถยนต์คันใหม่
            </CardTitle>
          </div>
          <CardContent className="p-6">
            <form onSubmit={addCar} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full sm:w-1/2 space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-slate-400" /> ทะเบียนรถ <span className="text-red-500">*</span>
                </label>
                <Input 
                  placeholder="เช่น กท 1234 กรุงเทพมหานคร" 
                  value={plate} 
                  onChange={(e) => setPlate(e.target.value)} 
                  className="h-11 focus-visible:ring-blue-600 border-slate-200"
                />
              </div>
              <div className="w-full sm:w-1/2 space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Car className="w-4 h-4 text-slate-400" /> ยี่ห้อ / รุ่น
                </label>
                <Input 
                  placeholder="เช่น Toyota Hilux Revo" 
                  value={brand} 
                  onChange={(e) => setBrand(e.target.value)} 
                  className="h-11 focus-visible:ring-blue-600 border-slate-200"
                />
              </div>
              <Button type="submit" className="h-11 w-full sm:w-auto px-8 bg-blue-600 hover:bg-blue-700 shadow-sm text-white font-medium rounded-lg transition-all active:scale-95">
                <Plus className="w-4 h-4 mr-2" /> บันทึกข้อมูล
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ✅ รายการรถทั้งหมด (เปลี่ยนเป็น Grid UI) */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 mt-8">
            <Car className="w-5 h-5 text-blue-600" /> รถยนต์ทั้งหมดในระบบ ({cars.length} คัน)
          </h2>

          {isLoading ? (
            // Loading State
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-slate-100">
              <Activity className="w-10 h-10 animate-spin text-blue-600 mb-4" />
              <p className="text-slate-500 font-medium">กำลังโหลดข้อมูลรถยนต์...</p>
            </div>
          ) : cars.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-slate-100 border-dashed">
              <Car className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium text-lg">ยังไม่มีข้อมูลรถยนต์ในระบบ</p>
              <p className="text-slate-400 text-sm mt-1">เพิ่มรถยนต์คันแรกของคุณที่ฟอร์มด้านบนได้เลย</p>
            </div>
          ) : (
            // Grid Cards
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cars.map((c) => (
                <Card key={c.id} className="group relative overflow-hidden border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 rounded-2xl bg-white">
                  
                  {/* พื้นหลังตกแต่ง Card */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full opacity-50 z-0"></div>

                  <CardContent className="p-6 relative z-10 flex flex-col items-center text-center">
                    
                    {/* ปุ่มลบ (ซ่อนไว้ โชว์ตอน Hover) */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteCar(c.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* กราฟิกป้ายทะเบียนรถ */}
                    <div className="mt-2 mb-4 w-full">
                      <div className="border-2 border-slate-800 rounded-lg p-1 bg-white shadow-sm inline-block w-[80%]">
                        <div className="border border-slate-300 rounded p-2 bg-gradient-to-b from-white to-slate-50 flex items-center justify-center min-h-[60px]">
                          <span className="font-bold text-lg sm:text-xl text-slate-800 tracking-wide text-center leading-tight">
                            {c.plate}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ยี่ห้อ/รุ่น */}
                    <div className="bg-slate-100 px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 flex items-center justify-center gap-2 mt-auto w-full max-w-[80%] truncate">
                      {c.brand ? (
                        <>
                          <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{c.brand}</span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">ไม่ได้ระบุรุ่น</span>
                      )}
                    </div>

                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
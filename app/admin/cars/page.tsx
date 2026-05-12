'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Car, Plus, Trash2, Tag, Activity, ShieldCheck, Moon, Sun } from 'lucide-react'

export default function AdminCars() {
  const [cars, setCars] = useState<any[]>([])
  const [plate, setPlate] = useState('')
  const [brand, setBrand] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // 🌙 State สำหรับ Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(false)

  // 🚀 โหลดสถานะ Dark Mode ตอนเข้าเว็บ
  useEffect(() => {
    const savedTheme = localStorage.getItem("dashboardTheme")
    if (savedTheme === "dark") {
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const toggleTheme = () => {
    if (isDarkMode) {
      setIsDarkMode(false)
      document.documentElement.classList.remove("dark")
      localStorage.setItem("dashboardTheme", "light")
    } else {
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
      localStorage.setItem("dashboardTheme", "dark")
    }
  }

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 transition-colors duration-300">
      <Navbar />
      <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 mt-4">
        
        {/* ✅ Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b dark:border-slate-700 pb-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 dark:bg-blue-500 p-3 rounded-xl shadow-sm">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">จัดการข้อมูลรถยนต์</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">เพิ่ม แก้ไข และลบรายชื่อรถยนต์ส่วนกลางในระบบ</p>
            </div>
          </div>
          
          {/* 🌙 ปุ่ม Toggle Dark Mode */}
          <Button
            onClick={toggleTheme}
            variant="outline"
            className="w-full sm:w-auto bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 mr-2 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 mr-2 text-indigo-500" />
            )}
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>

        {/* ✅ ฟอร์มเพิ่มรถใหม่ */}
        <Card className="border-none shadow-md bg-white dark:bg-slate-800 dark:border dark:border-slate-700 overflow-hidden rounded-2xl transition-colors">
          <div className="bg-blue-50/50 dark:bg-slate-800/80 border-b dark:border-slate-700 px-6 py-4">
            <CardTitle className="text-blue-800 dark:text-blue-400 flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5" /> เพิ่มรถยนต์คันใหม่
            </CardTitle>
          </div>
          <CardContent className="p-6">
            <form onSubmit={addCar} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full sm:w-1/2 space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-slate-400 dark:text-slate-500" /> ทะเบียนรถ <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <Input 
                  placeholder="เช่น กท 1234 กรุงเทพมหานคร" 
                  value={plate} 
                  onChange={(e) => setPlate(e.target.value)} 
                  className="h-11 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 dark:text-white dark:placeholder-slate-400"
                />
              </div>
              <div className="w-full sm:w-1/2 space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Car className="w-4 h-4 text-slate-400 dark:text-slate-500" /> ยี่ห้อ / รุ่น
                </label>
                <Input 
                  placeholder="เช่น Toyota Hilux Revo" 
                  value={brand} 
                  onChange={(e) => setBrand(e.target.value)} 
                  className="h-11 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 dark:text-white dark:placeholder-slate-400"
                />
              </div>
              <Button type="submit" className="h-11 w-full sm:w-auto px-8 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-sm text-white font-medium rounded-lg transition-all active:scale-95">
                <Plus className="w-4 h-4 mr-2" /> บันทึกข้อมูล
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ✅ รายการรถทั้งหมด (Grid UI) */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 mt-8">
            <Car className="w-5 h-5 text-blue-600 dark:text-blue-400" /> รถยนต์ทั้งหมดในระบบ ({cars.length} คัน)
          </h2>

          {isLoading ? (
            // Loading State
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
              <Activity className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">กำลังโหลดข้อมูลรถยนต์...</p>
            </div>
          ) : cars.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 border-dashed transition-colors">
              <Car className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">ยังไม่มีข้อมูลรถยนต์ในระบบ</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">เพิ่มรถยนต์คันแรกของคุณที่ฟอร์มด้านบนได้เลย</p>
            </div>
          ) : (
            // Grid Cards
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cars.map((c) => (
                <Card key={c.id} className="group relative overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 rounded-2xl bg-white dark:bg-slate-800">
                  
                  {/* พื้นหลังตกแต่ง Card */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50 dark:from-blue-900/20 to-transparent rounded-bl-full opacity-50 z-0"></div>

                  <CardContent className="p-6 relative z-10 flex flex-col items-center text-center">
                    
                    {/* ปุ่มลบ (ซ่อนไว้ โชว์ตอน Hover) */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteCar(c.id)}
                        className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 h-8 w-8 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* กราฟิกป้ายทะเบียนรถ */}
                    <div className="mt-2 mb-4 w-full">
                      <div className="border-2 border-slate-800 dark:border-slate-500 rounded-lg p-1 bg-white dark:bg-slate-400 shadow-sm inline-block w-[80%] transition-colors">
                        <div className="border border-slate-300 dark:border-slate-400 rounded p-2 bg-gradient-to-b from-white to-slate-50 dark:from-slate-200 dark:to-slate-300 flex items-center justify-center min-h-[60px]">
                          <span className="font-bold text-lg sm:text-xl text-slate-800 dark:text-slate-900 tracking-wide text-center leading-tight">
                            {c.plate}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ยี่ห้อ/รุ่น */}
                    <div className="bg-slate-100 dark:bg-slate-700/50 px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 mt-auto w-full max-w-[80%] truncate transition-colors">
                      {c.brand ? (
                        <>
                          <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="truncate">{c.brand}</span>
                        </>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">ไม่ได้ระบุรุ่น</span>
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
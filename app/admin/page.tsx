'use client'

import { Card } from "@/components/ui/card"
import Navbar from "@/components/Navbar"
import Link from "next/link"
import { 
  Car, 
  CalendarCheck, 
  Users, 
  FileBarChart, 
  LayoutDashboard, 
  Wrench, 
  Megaphone,
  ChevronRight
} from "lucide-react"

export default function AdminPage() {
  const adminMenus = [
    {
      title: "จัดการรถยนต์",
      description: "เพิ่ม ลบ หรือแก้ไขข้อมูลรถยนต์ในระบบ",
      icon: <Car className="w-8 h-8 text-blue-600" />,
      href: "/admin/cars",
      color: "from-blue-50 to-white",
      borderColor: "hover:border-blue-200"
    },
    {
      title: "รายการจองรถ",
      description: "ตรวจสอบและจัดการรายการจองทั้งหมด",
      icon: <CalendarCheck className="w-8 h-8 text-indigo-600" />,
      href: "/admin/bookings",
      color: "from-indigo-50 to-white",
      borderColor: "hover:border-indigo-200"
    },
    {
      title: "จัดการผู้ใช้งาน",
      description: "ควบคุมสิทธิ์และข้อมูลพนักงาน",
      icon: <Users className="w-8 h-8 text-purple-600" />,
      href: "/admin/users",
      color: "from-purple-50 to-white",
      borderColor: "hover:border-purple-200"
    },
    {
      title: "จัดการประกาศ",
      description: "สร้างข่าวสารหรือประกาศเด้ง Popup ให้ User",
      icon: <Megaphone className="w-8 h-8 text-red-600" />,
      href: "/admin/announcements", // ✅ หน้าที่เพิ่งเพิ่มไป
      color: "from-red-50 to-white",
      borderColor: "hover:border-red-200"
    },
    {
      title: "รายงานสรุปค่าไมล์",
      description: "ออกรายงานการใช้รถรายคนหรือรายแผนก",
      icon: <FileBarChart className="w-8 h-8 text-emerald-600" />,
      href: "/admin/reports",
      color: "from-emerald-50 to-white",
      borderColor: "hover:border-emerald-200"
    },
    {
      title: "Dashboard สถิติ",
      description: "ดูภาพรวมการใช้งานรถผ่านกราฟอัจฉริยะ",
      icon: <LayoutDashboard className="w-8 h-8 text-sky-600" />,
      href: "/admin/dashboard",
      color: "from-sky-50 to-white",
      borderColor: "hover:border-sky-200"
    },
    {
      title: "ระบบซ่อมบำรุง",
      description: "จัดการระยะเข้าศูนย์และแจ้งเตือนเลขไมล์",
      icon: <Wrench className="w-8 h-8 text-orange-600" />,
      href: "/admin/car-maintenance",
      color: "from-orange-50 to-white",
      borderColor: "hover:border-orange-200"
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <main className="p-6 max-w-7xl mx-auto space-y-8 mt-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              แผงควบคุมผู้ดูแลระบบ
            </h1>
            <p className="text-slate-500 mt-2">
              ยินดีต้อนรับกลับมา, จัดการระบบจองรถและข่าวสารโรงงานได้ที่นี่
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-medium text-slate-600">ระบบสถานะ: ปกติ</span>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminMenus.map((menu, index) => (
            <Link href={menu.href} key={index} className="group">
              <Card className={`h-full border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br ${menu.color} ${menu.borderColor} overflow-hidden relative`}>
                {/* Decorative element */}
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   {menu.icon}
                </div>

                <div className="p-6 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-slate-50">
                    {menu.icon}
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      {menu.title}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                      {menu.description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center text-sm font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                    คลิกเพื่อจัดการ <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Tips or Footer */}
        <footer className="mt-12 p-8 rounded-3xl bg-slate-900 text-white overflow-hidden relative">
          <div className="relative z-10">
            <h3 className="text-lg font-bold">💡 ข้อแนะนำสำหรับแอดมิน</h3>
            <p className="text-slate-400 mt-2 text-sm max-w-2xl">
              หากต้องการส่งประกาศสำคัญให้ User ทุกคนเห็นทันทีที่เปิดแอป ให้ใช้เมนู "จัดการประกาศ" และเลือกสถานะเป็น Active 
              ระบบจะแสดงผลแบบ Popup ให้กับทุกคนที่เข้าหน้าแรกของระบบจองรถ
            </p>
          </div>
          <div className="absolute right-[-10%] top-[-50%] w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        </footer>
      </main>
    </div>
  )
}
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { 
  Car, 
  CalendarCheck, 
  Users, 
  FileBarChart, 
  LayoutDashboard, 
  Wrench, 
  Megaphone,
  ChevronRight,
  Sun,
  Moon
} from "lucide-react";

export default function AdminPage() {
  // 🌙 State สำหรับ Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 🚀 โหลดสถานะ Dark Mode ตอนเข้าเว็บ
  useEffect(() => {
    const savedTheme = localStorage.getItem("dashboardTheme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
      localStorage.setItem("dashboardTheme", "light");
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
      localStorage.setItem("dashboardTheme", "dark");
    }
  };

  const adminMenus = [
    {
      title: "จัดการรถยนต์",
      description: "เพิ่ม ลบ หรือแก้ไขข้อมูลรถยนต์ในระบบ",
      icon: <Car className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      href: "/admin/cars",
      color: "from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800",
      borderColor: "hover:border-blue-200 dark:hover:border-blue-500/50"
    },
    {
      title: "รายการจองรถ",
      description: "ตรวจสอบและจัดการรายการจองทั้งหมด",
      icon: <CalendarCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />,
      href: "/admin/bookings",
      color: "from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800",
      borderColor: "hover:border-indigo-200 dark:hover:border-indigo-500/50"
    },
    {
      title: "จัดการผู้ใช้งาน",
      description: "ควบคุมสิทธิ์และข้อมูลพนักงาน",
      icon: <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />,
      href: "/admin/users",
      color: "from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-800",
      borderColor: "hover:border-purple-200 dark:hover:border-purple-500/50"
    },
    {
      title: "จัดการประกาศ",
      description: "สร้างข่าวสารหรือประกาศเด้ง Popup ให้ User",
      icon: <Megaphone className="w-8 h-8 text-red-600 dark:text-red-400" />,
      href: "/admin/announcements",
      color: "from-red-50 to-white dark:from-red-900/20 dark:to-slate-800",
      borderColor: "hover:border-red-200 dark:hover:border-red-500/50"
    },
    {
      title: "รายงานสรุปค่าไมล์",
      description: "ออกรายงานการใช้รถรายคนหรือรายแผนก",
      icon: <FileBarChart className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
      href: "/admin/reports",
      color: "from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800",
      borderColor: "hover:border-emerald-200 dark:hover:border-emerald-500/50"
    },
    {
      title: "Dashboard สถิติ",
      description: "ดูภาพรวมการใช้งานรถผ่านกราฟอัจฉริยะ",
      icon: <LayoutDashboard className="w-8 h-8 text-sky-600 dark:text-sky-400" />,
      href: "/admin/dashboard",
      color: "from-sky-50 to-white dark:from-sky-900/20 dark:to-slate-800",
      borderColor: "hover:border-sky-200 dark:hover:border-sky-500/50"
    },
    {
      title: "ระบบซ่อมบำรุง",
      description: "จัดการระยะเข้าศูนย์และแจ้งเตือนเลขไมล์",
      icon: <Wrench className="w-8 h-8 text-orange-600 dark:text-orange-400" />,
      href: "/admin/car-maintenance",
      color: "from-orange-50 to-white dark:from-orange-900/20 dark:to-slate-800",
      borderColor: "hover:border-orange-200 dark:hover:border-orange-500/50"
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Navbar />
      
      <main className="p-6 max-w-7xl mx-auto space-y-8 mt-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-8 transition-colors">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight transition-colors">
              แผงควบคุมผู้ดูแลระบบ
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 transition-colors">
              ยินดีต้อนรับกลับมา, จัดการระบบจองรถและข่าวสารโรงงานได้ที่นี่
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 🌙 ปุ่ม Toggle Dark Mode */}
            <Button
              onClick={toggleTheme}
              variant="outline"
              className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 mr-2 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 mr-2 text-indigo-500" />
              )}
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </Button>

            <div className="bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3 transition-colors h-10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">ระบบสถานะ: ปกติ</span>
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminMenus.map((menu, index) => (
            <Link href={menu.href} key={index} className="group">
              <Card className={`h-full border border-slate-100 dark:border-slate-700 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br ${menu.color} ${menu.borderColor} overflow-hidden relative`}>
                {/* Decorative element */}
                <div className="absolute -right-4 -bottom-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
                   {menu.icon}
                </div>

                <div className="p-6 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800/80 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-slate-50 dark:border-slate-700">
                    {menu.icon}
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      {menu.title}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                      {menu.description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center text-sm font-semibold text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    คลิกเพื่อจัดการ <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Tips or Footer */}
        <footer className="mt-12 p-8 rounded-3xl bg-slate-900 dark:bg-slate-950 text-white overflow-hidden relative border dark:border-slate-800 transition-colors">
          <div className="relative z-10">
            <h3 className="text-lg font-bold">💡 ข้อแนะนำสำหรับแอดมิน</h3>
            <p className="text-slate-400 mt-2 text-sm max-w-2xl leading-relaxed">
              หากต้องการส่งประกาศสำคัญให้ User ทุกคนเห็นทันทีที่เปิดแอป ให้ใช้เมนู "จัดการประกาศ" และเลือกสถานะเป็น Active 
              ระบบจะแสดงผลแบบ Popup ให้กับทุกคนที่เข้าหน้าแรกของระบบจองรถ
            </p>
          </div>
          <div className="absolute right-[-10%] top-[-50%] w-64 h-64 bg-blue-500/20 dark:bg-blue-600/10 rounded-full blur-3xl transition-colors"></div>
        </footer>
      </main>
    </div>
  )
}
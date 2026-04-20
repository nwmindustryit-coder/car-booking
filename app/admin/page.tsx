'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Navbar from "@/components/Navbar"
import Link from "next/link"

export default function AdminPage() {
  return (
    <>
      <Navbar />
      <main className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-700 mb-6">แดชบอร์ดผู้ดูแลระบบ</h1>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition">
            <CardHeader>
              <CardTitle>🚘 จัดการรถ</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/admin/cars" className="text-blue-600 hover:underline">ไปยังหน้ารถ</Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition">
            <CardHeader>
              <CardTitle>📅 การจอง</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/admin/bookings" className="text-blue-600 hover:underline">ดูการจองทั้งหมด</Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition">
            <CardHeader>
              <CardTitle>👤 ผู้ใช้</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/admin/users" className="text-blue-600 hover:underline">จัดการผู้ใช้</Link>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition">
            <CardHeader>
              <CardTitle>📝 รายงาน</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/admin/reports" className="text-blue-600 hover:underline">ออกรายงาน</Link><br />
              <Link href="/admin/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition">
            <CardHeader>
              <CardTitle>⚠️ แจ้งระยะเข้าศูนย์</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/admin/car-maintenance" className="text-blue-600 hover:underline">กรอกข้อมูล</Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}

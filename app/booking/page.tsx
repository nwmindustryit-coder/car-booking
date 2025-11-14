'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import Navbar from '@/components/Navbar'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from "lucide-react"
import { format, isToday } from "date-fns"
import { th } from "date-fns/locale"


const TIME_SLOTS = [
    'ก่อนเวลางาน',
    '08:00-10:00',
    '10:01-12:00',
    '13:00-15:00',
    '15:01-17:00',
    'หลังเวลางาน',
]

export default function BookingPage() {
    const [cars, setCars] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [date, setDate] = useState<Date | null>(new Date())
    const [selectedTimes, setSelectedTimes] = useState<string[]>([])
    const [form, setForm] = useState({ driver_name: '', car_id: '', destination: '', reason: '' })
    const [bookingStatus, setBookingStatus] = useState<Record<string, string>>({})
    const router = useRouter()
    const [serverTime, setServerTime] = useState<string | null>(null)

    // ✅ โหลดเวลาจากฝั่งเซิร์ฟเวอร์ Supabase
    useEffect(() => {
        const loadServerTime = async () => {
            const { data, error } = await supabase.rpc('get_server_time')
            if (error) console.error('Error fetching server time:', error)
            else if (data) {
                // แปลงเวลามาให้อ่านง่ายขึ้น
                const localTime = new Date(data).toLocaleString()
                setServerTime(localTime)
            }
        }
        loadServerTime()
    }, [])

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return router.push('/login')
            setUser(user)

            const { data: cars } = await supabase.from('cars').select('*')
            setCars(cars || [])
        }
        init()
    }, [router])



    // ตรวจสอบว่าช่วงเวลาใดถูกจองแล้ว
    useEffect(() => {
        const checkBookings = async () => {
            if (!form.car_id || !date) return

            // ✅ ใช้ local date ไม่แปลงเป็น UTC
            const formattedDate = date.toLocaleDateString('sv-SE')

            const { data, error } = await supabase
                .from('bookings')
                .select('time_slot, driver_name')
                .eq('car_id', form.car_id)
                .eq('date', formattedDate)

            if (error) {
                console.error('Error loading bookings:', error)
                return
            }

            const status: Record<string, string> = {}
            for (const slot of TIME_SLOTS) status[slot] = 'ว่าง'

            // ✅ mark เวลาที่ซ้ำว่าไม่ว่าง
            for (const booking of data || []) {
                const bookedSlots = booking.time_slot.split(',').map((s) => s.trim())
                for (const slot of TIME_SLOTS) {
                    if (bookedSlots.includes(slot)) {
                        status[slot] = booking.driver_name
                    }
                }
            }

            setBookingStatus(status)
        }

        checkBookings()
    }, [form.car_id, date])




    const toggleTimeSlot = (slot: string) => {
        setSelectedTimes((prev) =>
            prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
        )
    }

    const handleSubmit = async (e: any) => {
        e.preventDefault()
        if (!user) return
        if (!form.car_id || selectedTimes.length === 0)
            return alert('กรุณาเลือกรถและช่วงเวลาอย่างน้อย 1 ช่วง')

        // เรียงลำดับช่วงเวลาที่เลือกไว้
        const sortedTimes = [...selectedTimes].sort((a, b) =>
            TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b)
        )

        // ดึงช่วงแรกสุดและสุดท้าย
        const firstSlot = sortedTimes[0]
        const lastSlot = sortedTimes[sortedTimes.length - 1]

        // ✅ เก็บทุกช่วงเวลาไว้ในรูป string เช่น "08:00-10:00, 13:00-15:00"
        const combinedSlot = selectedTimes.join(', ')


        // ✅ insert ครั้งเดียว
        const { error } = await supabase.from('bookings').insert({

            user_id: user.id,
            user_name: user.email,
            car_id: form.car_id,
            driver_name: form.driver_name,
            date: date.toLocaleDateString('sv-SE'),
            time_slot: combinedSlot,
            destination: form.destination,
            reason: form.reason,
        })

        if (error) {
            console.error(error)
        } else {

            // 🟢 ส่งแจ้งเตือน LINE Notify — เมื่อมีการจองใหม่
            await fetch("/api/line/notify-booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // user_name: user.email,
                    driver_name: form.driver_name,
                    destination: form.destination,
                    time_slot: combinedSlot,
                    car_plate: cars.find(c => c.id == form.car_id)?.plate || "",
                    date: date.toLocaleDateString('sv-SE'),
                }),
            });

            alert(`จองรถสำเร็จ (ช่วงเวลา: ${combinedSlot})`)
            router.push('/')
        }
    }

    if (!user) {
        return (
            <main className="flex flex-col items-center justify-center h-screen text-blue-600">
                <svg
                    className="animate-spin h-8 w-8 mb-3 text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                </svg>
                <p className="text-gray-500 animate-pulse">
                    กำลังตรวจสอบสิทธิ์ผู้ใช้...
                </p>
            </main>
        )
    }

    return (
        <>
            <Navbar />
            <main className="p-6 max-w-2xl mx-auto space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>จองรถใหม่</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <label className="block text-sm font-medium">วันที่จอง</label>
                            <DatePicker selected={date} onChange={setDate} className="border rounded-md p-2 w-full" dateFormat="dd/MM/yyyy" />

                            <label className="block text-sm font-medium">ทะเบียนรถ</label>
                            <select className="w-full border p-2 rounded-md" value={form.car_id} onChange={(e) => setForm({ ...form, car_id: e.target.value })}>
                                <option value="">-- เลือกรถ --</option>
                                {cars.map((c) => <option key={c.id} value={c.id}>{c.plate}</option>)}
                            </select>

                            <label className="block text-sm font-medium">ชื่อผู้ขับ</label>
                            <input className="w-full border p-2 rounded-md" value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} />

                            <label className="block text-sm font-medium">เลือกช่วงเวลา</label>
                            <div className="grid grid-cols-2 gap-2">
                                {TIME_SLOTS.map((slot) => (
                                    <Button
                                        key={slot}
                                        type="button"
                                        variant={selectedTimes.includes(slot) ? "default" : "outline"}
                                        onClick={() => toggleTimeSlot(slot)}
                                        disabled={bookingStatus[slot] && bookingStatus[slot] !== 'ว่าง'}
                                    >
                                        {slot}{' '}
                                        {bookingStatus[slot]
                                            ? bookingStatus[slot] === 'ว่าง'
                                                ? <Badge className="ml-2 bg-green-500">ว่าง</Badge>
                                                : <Badge className="ml-2 bg-red-500">{bookingStatus[slot]}</Badge>
                                            : ''}
                                    </Button>
                                ))}
                            </div>

                            <label className="block text-sm font-medium">สถานที่</label>
                            <input className="w-full border p-2 rounded-md" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />

                            <label className="block text-sm font-medium">เหตุผล</label>
                            <textarea className="w-full border p-2 rounded-md" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}></textarea>

                            <Button type="submit" className="w-full bg-blue-600 text-white py-2">บันทึกการจอง</Button>
                            {/* ปุ่มกลับ */}
                            <Link href="/" className="block">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full flex items-center justify-center gap-2 border-blue-400 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    กลับหน้าหลัก
                                </Button>
                            </Link>
                        </form>
                    </CardContent>
                </Card>
                {/* ✅ Debug: แสดง timezone ทั้งฝั่งเครื่องและเซิร์ฟเวอร์ */}
                {/* <div className="mt-8 p-4 bg-gray-50 border rounded-lg text-sm text-gray-700 space-y-1">
                    <p><b>🕒 Timezone Debug</b></p>
                    <p>🌍 <b>เวลาปัจจุบัน (เครื่องผู้ใช้):</b> {new Date().toLocaleString()}</p>
                    <p>🧭 <b>Time Zone (เครื่องผู้ใช้):</b> {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                    <p>🗓 <b>วันที่ Local ที่ใช้ในการจอง:</b> {date?.toLocaleDateString('sv-SE')}</p>
                    <p>💾 <b>วันที่ ISO (UTC):</b> {date?.toISOString()}</p>

                    {serverTime ? (
                        <>
                            <hr className="my-2" />
                            <p>🖥 <b>เวลาฝั่งเซิร์ฟเวอร์ Supabase:</b> {serverTime}</p>
                        </>
                    ) : (
                        <p className="italic text-gray-400">กำลังโหลดเวลาจากเซิร์ฟเวอร์...</p>
                    )}
                </div> */}


            </main>
        </>
    )
}

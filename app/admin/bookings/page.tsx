'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { format, isToday } from "date-fns"
import { th } from "date-fns/locale"
import { EyeIcon } from 'lucide-react'



export default function AdminBookings() {
    const [bookings, setBookings] = useState<any[]>([])
    const [editBooking, setEditBooking] = useState<any | null>(null)
    const [editForm, setEditForm] = useState({
        driver_name: '',
        destination: '',
        reason: '',
        date: new Date(),
    })
    const [selectedEditTimes, setSelectedEditTimes] = useState<string[]>([])
    const [editBookingStatus, setEditBookingStatus] = useState<Record<string, string>>({})
    const [showDetail, setShowDetail] = useState<any | null>(null)

    const TIME_SLOTS = [
        'ก่อนเวลางาน',
        '08:00-10:00',
        '10:01-12:00',
        '13:00-15:00',
        '15:01-17:00',
        'หลังเวลางาน',
    ]

    function mergeTimeSlots(timeSlotString: string): string {
        if (!timeSlotString) return ''
        const slots = timeSlotString.split(',').map(s => s.trim())
        if (slots.length === 1) return slots[0]

        const indexes = slots
            .map(s => TIME_SLOTS.indexOf(s))
            .filter(i => i !== -1)
            .sort((a, b) => a - b)

        if (indexes.length === 0) return timeSlotString

        const groups: number[][] = []
        let currentGroup: number[] = [indexes[0]]

        // ✅ จัดกลุ่มช่วงเวลาที่ต่อเนื่องกัน
        for (let i = 1; i < indexes.length; i++) {
            if (indexes[i] === indexes[i - 1] + 1) {
                currentGroup.push(indexes[i])
            } else {
                groups.push(currentGroup)
                currentGroup = [indexes[i]]
            }
        }
        groups.push(currentGroup)

        // ✅ แปลงแต่ละกลุ่มเป็นข้อความช่วงเวลา
        const formattedGroups = groups.map(group => {
            const firstSlot = TIME_SLOTS[group[0]]
            const lastSlot = TIME_SLOTS[group[group.length - 1]]

            // กรณีช่วงเดียว
            if (group.length === 1) return firstSlot

            // กรณีแรกคือ "ก่อนเวลางาน"
            if (firstSlot === 'ก่อนเวลางาน') {
                const endTime = lastSlot.split('-').pop()
                return `ก่อนเวลางาน-${endTime}`
            }

            // กรณีท้ายคือ "หลังเวลางาน"
            if (lastSlot === 'หลังเวลางาน') {
                const startTime = firstSlot.split('-')[0]
                return `${startTime}-หลังเวลางาน`
            }

            // กรณีทั่วไป
            const startTime = firstSlot.split('-')[0]
            const endTime = lastSlot.split('-').pop()
            return `${startTime}-${endTime}`
        })

        // ✅ รวมข้อความแต่ละกลุ่มด้วยคำว่า "และ"
        return formattedGroups.join(' และ ')
    }

    const loadBookings = async () => {
        const { data, error } = await supabase
            .from("bookings")
            .select(`
    *,
    cars(plate),
    miles (
      total_mile
    )
  `)

            .order("date", { ascending: false })

        if (error) {
            console.error("Error loading bookings:", error)
            return
        }

        // ✅ เพิ่ม field miles_status
        const mapped = data.map((b: any) => ({
            ...b,
            miles_status: b.miles && b.miles.length > 0 ? "recorded" : "missing",
            total_mile:
                b.miles && b.miles[0]?.total_mile
                    ? b.miles[0].total_mile
                    : null,
        }))

        setBookings(mapped)
    }



    // ✅ โหลดข้อมูลทั้งหมด
    // const load = async () => {
    //     const { data, error } = await supabase
    //         .from('bookings')
    //         .select('*, cars(plate)')
    //         .order('date', { ascending: false })
    //     if (error) console.error(error)
    //     setBookings(data || [])
    // }

    // ✅ ลบได้ทุกคน
    const deleteBooking = async (id: number) => {
        if (!confirm('ต้องการลบการจองนี้หรือไม่?')) return
        const { error } = await supabase.from('bookings').delete().eq('id', id)
        if (error) alert(error.message)
        else loadBookings()
    }

    useEffect(() => { loadBookings() }, [])

    // ✅ ตรวจสอบเวลาว่าง
    useEffect(() => {
        const checkBookingAvailability = async () => {
            if (!editBooking?.car_id || !editForm.date) return

            const { data, error } = await supabase
                .from('bookings')
                .select('time_slot, driver_name')
                .eq('car_id', editBooking.car_id)
                .eq('date', editForm.date.toISOString().split('T')[0])

            if (error) {
                console.error('Error loading booking availability:', error)
                return
            }

            const status: Record<string, string> = {}
            for (const slot of TIME_SLOTS) status[slot] = 'ว่าง'

            for (const booking of data || []) {
                const bookedSlots = booking.time_slot?.split(',').map((s: string) => s.trim()) ?? []
                for (const slot of TIME_SLOTS) {
                    if (bookedSlots.includes(slot)) status[slot] = booking.driver_name
                }
            }

            setEditBookingStatus(status)
        }

        if (editBooking) checkBookingAvailability()
    }, [editBooking, editForm.date])

    // ✅ รีเซ็ตเวลาเมื่อเปลี่ยนวัน
    useEffect(() => {
        if (editBooking) setSelectedEditTimes([])
    }, [editForm.date])

    return (
        <>
            <Navbar />
            <main className="p-4 sm:p-6 max-w-6xl mx-auto">
                <h1 className="text-xl sm:text-2xl font-bold text-blue-700 mb-4">
                    จัดการการจองทั้งหมด (แอดมิน)
                </h1>

                <div className="bg-white rounded-xl shadow overflow-hidden">
                    {Object.entries(
                        bookings.reduce((groups, booking) => {
                            const date = new Date(booking.date).toISOString().split("T")[0] // ✅ normalize วันที่
                            if (!groups[date]) groups[date] = []
                            groups[date].push(booking)
                            return groups
                        }, {} as Record<string, any[]>)
                    )
                        // ✅ เรียงวันที่จากใหม่ → เก่า
                        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                        .map(([date, group]: [string, any[]]) => {
                            const d = new Date(date)
                            const month = d.getMonth()
                            const isEvenMonth = month % 2 === 0

                            // ✅ สีสลับแต่ละเดือน และเน้น "วันนี้"
                            const bgColor = isToday(d)
                                ? "bg-green-600"
                                : isEvenMonth
                                    ? "bg-gray-700"
                                    : "bg-gray-600"

                            return (
                                <div key={date} className="border-b last:border-none">
                                    {/* ✅ ส่วนหัวของแต่ละวัน */}
                                    <div
                                        className={`px-4 py-2 text-sm sm:text-base font-semibold text-white flex justify-between items-center ${bgColor}`}
                                    >
                                        <div>
                                            📅 {format(d, "dd MMMM yyyy", { locale: th })}{" "}
                                            {isToday(d) && "(วันนี้)"}
                                        </div>
                                        <div className="text-sm text-gray-200">
                                            ({group.length.toLocaleString("th-TH")} รายการ)
                                        </div>
                                    </div>

                                    {/* ✅ ตารางของวันนั้น */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs sm:text-sm min-w-[700px]">
                                            <thead className="bg-blue-100 text-blue-800">
                                                <tr>
                                                    <th className="p-2 sm:p-3 text-left">อีเมลผู้จอง</th>
                                                    <th className="p-2 sm:p-3">ชื่อผู้ขับ</th>
                                                    <th className="p-2 sm:p-3">ทะเบียนรถ</th>
                                                    <th className="p-2 sm:p-3">ช่วงเวลา</th>
                                                    <th className="p-2 sm:p-3">สถานที่</th>
                                                    <th className="p-2 sm:p-3">เหตุผล</th>
                                                    <th className="p-2 sm:p-3">เลขไมล์</th>
                                                    <th className="p-2 sm:p-3">ดู</th>
                                                    <th className="p-2 sm:p-3 text-center">จัดการ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.map((b: any) => (
                                                    <tr key={b.id} className="border-b hover:bg-blue-50">
                                                        <td className="p-2 sm:p-3">{b.user_name}</td>
                                                        <td className="p-2 sm:p-3 text-center">{b.driver_name}</td>
                                                        <td className="p-2 sm:p-3 text-center">
                                                            <Badge>{b.cars?.plate}</Badge>
                                                        </td>
                                                        <td className="p-2 sm:p-3 text-center">
                                                            {mergeTimeSlots(b.time_slot)}
                                                        </td>
                                                        <td className="p-2 sm:p-3">{b.destination}</td>
                                                        <td className="p-2 sm:p-3">{b.reason}</td>

                                                        {/* ✅ แสดงสถานะเลขไมล์ */}
                                                        <td className="p-2 sm:p-3 text-center">
                                                            {b.miles_status === "recorded" ? (
                                                                <span className="text-green-700 font-semibold">
                                                                    ✅ บันทึกแล้ว ({b.total_mile} กม.)
                                                                </span>
                                                            ) : (
                                                                <span className="text-orange-600 font-semibold">
                                                                    ⚠️ ยังไม่ได้บันทึกเลขไมล์
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* ✅ ปุ่มดูรายละเอียด */}
                                                        <td className="p-2 sm:p-3 text-center flex flex-col sm:flex-row sm:justify-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={async () => {
                                                                    const { data: milesData, error } = await supabase
                                                                        .from("miles")
                                                                        .select("start_mile, end_mile, total_mile")
                                                                        .eq("booking_id", b.id)
                                                                        .limit(1)
                                                                        .maybeSingle()

                                                                    if (error) console.error("Error loading miles:", error)
                                                                    setShowDetail({ ...b, miles: milesData || null })
                                                                }}
                                                            >
                                                                <EyeIcon className="w-4 h-4 mr-1" /> ดู
                                                            </Button>
                                                        </td>

                                                        {/* ✅ ปุ่มแก้ไข/ลบ */}
                                                        <td className="p-3 text-center space-x-2">
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() => {
                                                                    setEditForm({
                                                                        driver_name: b.driver_name,
                                                                        destination: b.destination,
                                                                        reason: b.reason,
                                                                        date: new Date(b.date),
                                                                    })
                                                                    setSelectedEditTimes(
                                                                        b.time_slot.split(",").map((s) => s.trim())
                                                                    )
                                                                    setEditBooking(b)
                                                                }}
                                                            >
                                                                ✏️ แก้ไข
                                                            </Button>

                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => deleteBooking(b.id)}
                                                            >
                                                                🗑️ ลบ
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        })}
                </div>
                {/* ✅ Dialog แสดงรายละเอียด */}
                <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>รายละเอียดการจอง</DialogTitle>
                        </DialogHeader>
                        {showDetail && (
                            <div className="space-y-2 text-sm">
                                <p><b>อีเมลผู้จอง:</b> {showDetail.user_name}</p>
                                <p><b>ชื่อผู้ขับ:</b> {showDetail.driver_name}</p>
                                <p><b>ทะเบียนรถ:</b> {showDetail.cars?.plate}</p>
                                <p><b>วันที่:</b> {showDetail.date}</p>
                                <p><b>ช่วงเวลา:</b> {showDetail.time_slot}</p>
                                <p><b>สถานที่:</b> {showDetail.destination}</p>
                                <p><b>เหตุผล:</b> {showDetail.reason}</p>

                                {/* ✅ แสดงเลขไมล์ถ้ามี */}
                                {showDetail.miles ? (
                                    <div className="pt-2 border-t mt-2">
                                        <p><b>เลขไมล์เริ่มต้น:</b> {showDetail.miles.start_mile}</p>
                                        <p><b>เลขไมล์สิ้นสุด:</b> {showDetail.miles.end_mile}</p>
                                        <p className="text-blue-700 font-semibold">
                                            🚗 ใช้ไปทั้งหมด {showDetail.miles.total_mile ?? showDetail.miles.end_mile - showDetail.miles.start_mile} กม.
                                        </p>
                                    </div>
                                ) : (
                                    <p className="italic text-gray-400 pt-2 border-t mt-2">
                                        ยังไม่ได้บันทึกเลขไมล์
                                    </p>
                                )}
                            </div>
                        )}


                    </DialogContent>
                </Dialog>
            </main>

            {/* ✅ Dialog แก้ไข */}
            <Dialog open={!!editBooking} onOpenChange={() => setEditBooking(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>แก้ไขการจอง</DialogTitle>
                    </DialogHeader>

                    {editBooking && (
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault()

                                const newTimeSlots = TIME_SLOTS
                                    .filter(slot => selectedEditTimes.includes(slot))
                                    .join(', ')

                                if (!newTimeSlots) {
                                    alert('กรุณาเลือกช่วงเวลาอย่างน้อย 1 ช่วง')
                                    return
                                }

                                // ✅ ตรวจเวลาทับ
                                const { data: checkData } = await supabase
                                    .from('bookings')
                                    .select('id, time_slot')
                                    .eq('car_id', editBooking.car_id)
                                    .eq('date', editForm.date.toISOString().split('T')[0])

                                const conflict = checkData?.some(b => {
                                    if (b.id === editBooking.id) return false
                                    const booked = b.time_slot.split(',').map(s => s.trim())
                                    return booked.some(slot => selectedEditTimes.includes(slot))
                                })

                                if (conflict) {
                                    alert('บางช่วงเวลาที่เลือกถูกจองแล้ว กรุณาเลือกเวลาใหม่')
                                    return
                                }

                                const { error } = await supabase
                                    .from('bookings')
                                    .update({
                                        driver_name: editForm.driver_name,
                                        destination: editForm.destination,
                                        reason: editForm.reason,
                                        date: editForm.date.toLocaleDateString('sv-SE'),
                                        time_slot: newTimeSlots,
                                    })
                                    .eq('id', editBooking.id)

                                if (error) {
                                    console.error('Update error:', error)
                                    alert(error.message)
                                } else {
                                    alert('อัปเดตข้อมูลเรียบร้อย ✅')
                                    setEditBooking(null)
                                    loadBookings()
                                }
                            }}
                            className="space-y-3"
                        >
                            <label className="block text-sm font-medium">ชื่อผู้ขับ</label>
                            <Input
                                value={editForm.driver_name}
                                onChange={(e) => setEditForm({ ...editForm, driver_name: e.target.value })}
                            />

                            <label className="block text-sm font-medium">สถานที่</label>
                            <Input
                                value={editForm.destination}
                                onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                            />

                            <label className="block text-sm font-medium">เหตุผล</label>
                            <Input
                                value={editForm.reason}
                                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                            />

                            <label className="block text-sm font-medium">วันที่</label>
                            <DatePicker
                                selected={editForm.date}
                                onChange={(d: Date | null) => {
                                    if (d) setEditForm({ ...editForm, date: d })
                                }}
                                dateFormat="dd/MM/yyyy"
                                className="border rounded-md p-2 w-full"
                            />


                            <label className="block text-sm font-medium">ช่วงเวลา</label>
                            <div className="grid grid-cols-2 gap-2">
                                {TIME_SLOTS.map((slot) => {
                                    const isBooked = editBookingStatus[slot] && editBookingStatus[slot] !== 'ว่าง'
                                    const bookedBy = editBookingStatus[slot]
                                    const isSelected = selectedEditTimes.includes(slot)

                                    return (
                                        <Button
                                            key={slot}
                                            type="button"
                                            variant={isSelected ? "default" : "outline"}
                                            onClick={() => {
                                                if (!isBooked || bookedBy === editForm.driver_name) {
                                                    setSelectedEditTimes((prev) =>
                                                        prev.includes(slot)
                                                            ? prev.filter((s) => s !== slot)
                                                            : [...prev, slot]
                                                    )
                                                }
                                            }}
                                            disabled={isBooked && bookedBy !== editForm.driver_name}
                                            className="flex items-center justify-center gap-1"
                                        >
                                            {slot}
                                            {isBooked ? (
                                                <Badge className="ml-1 bg-red-500">{bookedBy}</Badge>
                                            ) : (
                                                <Badge className="ml-1 bg-green-500">ว่าง</Badge>
                                            )}
                                        </Button>
                                    )
                                })}
                            </div>

                            <Button type="submit" className="w-full bg-blue-600 text-white">
                                💾 บันทึกการแก้ไข
                            </Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}

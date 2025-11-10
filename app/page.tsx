'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GaugeIcon, EyeIcon } from 'lucide-react'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
// import { Checkbox } from "@/components/ui/checkbox"
import { format, isToday } from "date-fns"
import { th } from "date-fns/locale"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"



export default function Dashboard() {
  useAuthRedirect(true) // ✅ บังคับให้ login ก่อนเข้าได้

  const [bookings, setBookings] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)
  const [showDetail, setShowDetail] = useState<any | null>(null)
  const [startMile, setStartMile] = useState('')
  const [endMile, setEndMile] = useState('')
  const [usedMile, setUsedMile] = useState<number | null>(null)
  const [user, setUser] = useState<any>(null)
  const [editBooking, setEditBooking] = useState<any | null>(null)
  const [selectedEditTimes, setSelectedEditTimes] = useState<string[]>([])
  const [editBookingStatus, setEditBookingStatus] = useState<Record<string, string>>({})
  const [editForm, setEditForm] = useState({
    driver_name: '',
    destination: '',
    reason: '',
    date: new Date(), // ✅ เพิ่มวันที่ที่จะแก้ไข
  })


  const router = useRouter()

  // ✅ ฟังก์ชันแก้ไขการจอง
  const handleEditBooking = async (booking: any) => {
    const newDestination = prompt('แก้ไขสถานที่:', booking.destination)
    if (newDestination === null) return

    const { error } = await supabase
      .from('bookings')
      .update({ destination: newDestination })
      .eq('id', booking.id)
      .eq('user_id', user.id) // ✅ ป้องกันไม่ให้แก้ของคนอื่น

    if (error) alert(error.message)
    else {
      alert('แก้ไขข้อมูลสำเร็จ')
      loadBookings()
    }
  }

  // ✅ ฟังก์ชันลบการจอง
  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('ต้องการลบรายการจองนี้หรือไม่?')) return

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      .eq('user_id', user.id) // ✅ ป้องกันไม่ให้ลบของคนอื่น

    if (error) alert(error.message)
    else {
      alert('ลบรายการสำเร็จ')
      loadBookings()
    }
  }


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



  // ✅ โหลดข้อมูลหลังจากที่ผู้ใช้ล็อกอินแล้ว
  useEffect(() => {
    const getUserAndLoad = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser(data.user)
        loadBookings()
      }
    }
    getUserAndLoad()
  }, [])

  const loadBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*, cars(plate)')
      .order('date', { ascending: false })
    setBookings(data || [])
  }

  // ✅ ตรวจสอบช่วงเวลาว่างเมื่อเปิด Dialog แก้ไข
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
        const bookedSlots = booking.time_slot.split(',').map(s => s.trim())
        for (const slot of TIME_SLOTS) {
          if (bookedSlots.includes(slot)) status[slot] = booking.driver_name
        }
      }

      setEditBookingStatus(status)
    }

    if (editBooking) checkBookingAvailability()
  }, [editBooking, editForm.date])


  // ✅ คำนวณระยะทาง
  useEffect(() => {
    if (startMile && endMile) {
      const total = Number(endMile) - Number(startMile)
      setUsedMile(total >= 0 ? total : 0)
    } else setUsedMile(null)
  }, [startMile, endMile])

  const filtered = bookings.filter(b =>
  (b.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.cars?.plate?.toLowerCase().includes(search.toLowerCase()))
  )

  // ✅ ฟังก์ชันบันทึกไมล์
  const handleSaveMiles = async () => {
    if (!startMile || !endMile) return alert('กรุณากรอกเลขไมล์ให้ครบ')
    const total = Number(endMile) - Number(startMile)
    if (total < 0) return alert('เลขไมล์สิ้นสุดต้องมากกว่าเลขไมล์เริ่มต้น')

    const { error } = await supabase.from('miles').insert({
      booking_id: selectedBooking.id,
      start_mile: Number(startMile),
      end_mile: Number(endMile)
    })

    if (error) alert(error.message)
    else {
      alert(`บันทึกเลขไมล์เรียบร้อย (ใช้ไป ${total} กม.)`)
      setSelectedBooking(null)
      setStartMile('')
      setEndMile('')
      setUsedMile(null)
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
      <div className="p-6">
      <main className="p-4 sm:p-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-blue-700">รายการจองรถ</h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Input
              placeholder="🔍 ค้นหาชื่อผู้จอง / ผู้ขับ / ทะเบียนรถ"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-72"
            />
            <Button onClick={() => location.href = '/booking'}>+ จองรถ</Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {Object.entries(
            bookings.reduce((groups, booking) => {
              const date = booking.date
              if (!groups[date]) groups[date] = []
              groups[date].push(booking)
              return groups
            }, {} as Record<string, any[]>)
          ).map(([date, group]: [string, any[]]) => (
            <div key={date} className="border-b last:border-none">
              {/* ✅ ส่วนหัวของแต่ละวัน */}
              <div
                className={`px-4 py-2 text-sm sm:text-base font-semibold text-white ${isToday(new Date(date)) ? "bg-green-600" : "bg-gray-600"
                  }`}
              >
                {format(new Date(date), "dd MMMM yyyy", { locale: th })}{" "}
                {isToday(new Date(date)) && "(วันนี้)"}
              </div>

              {/* ✅ ตารางข้อมูลของวันนั้น */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[700px]">
                  <thead className="bg-blue-100 text-blue-800">
                    <tr>
                      <th className="p-2 sm:p-3 text-left">อีเมลผู้จอง</th>
                      <th className="p-2 sm:p-3">ชื่อผู้ขับ</th>
                      <th className="p-2 sm:p-3">ทะเบียนรถ</th>
                      <th className="p-2 sm:p-3">วันที่</th>
                      <th className="p-2 sm:p-3">ช่วงเวลา</th>
                      <th className="p-2 sm:p-3">สถานที่</th>
                      <th className="p-2 sm:p-3">เหตุผล</th>
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
                        <td className="p-2 sm:p-3 text-center">{b.date}</td>
                        <td className="p-2 sm:p-3 text-center">{mergeTimeSlots(b.time_slot)}</td>
                        <td className="p-2 sm:p-3">{b.destination}</td>
                        <td className="p-2 sm:p-3">{b.reason}</td>
                        <td className="p-2 sm:p-3 text-center space-y-1 sm:space-x-2 sm:space-y-0 flex flex-col sm:flex-row justify-center">
                          <Button size="sm" variant="outline" onClick={async () => {
                            const { data: milesData, error } = await supabase
                              .from("miles")
                              .select("start_mile, end_mile, total_mile")
                              .eq("booking_id", b.id)
                              .limit(1)
                              .maybeSingle()

                            if (error) console.error("Error loading miles:", error)
                            setShowDetail({ ...b, miles: milesData || null })
                          }}>
                            <EyeIcon className="w-4 h-4 mr-1" /> ดู
                          </Button>

                          <Button size="sm" variant="outline" onClick={() => setSelectedBooking(b)}>
                            <GaugeIcon className="w-4 h-4 mr-1" /> ไมล์
                          </Button>

                          {b.user_id === user.id && (
                            <>
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
                                  setSelectedEditTimes(b.time_slot.split(",").map((s) => s.trim()))
                                  setEditBooking(b)
                                }}
                              >
                                ✏️
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteBooking(b.id)}
                              >
                                🗑️
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>


        {/* ✅ Dialog แสดงรายละเอียด */}
        <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
          <DialogContent className="w-[95vw] sm:max-w-md">
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

        {/* ✅ Dialog กรอกเลขไมล์ */}
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>บันทึกเลขไมล์</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  รถทะเบียน <b>{selectedBooking.cars?.plate}</b> <br />
                  ผู้ขับ: <b>{selectedBooking.driver_name}</b>
                </p>
                <Input
                  type="number"
                  placeholder="เลขไมล์เริ่มต้น"
                  value={startMile}
                  onChange={(e) => setStartMile(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="เลขไมล์สิ้นสุด"
                  value={endMile}
                  onChange={(e) => setEndMile(e.target.value)}
                />
                {usedMile !== null && (
                  <p className="text-center text-sm text-blue-700">
                    รวมระยะทางที่ใช้: <b>{usedMile}</b> กม.
                  </p>
                )}
                <Button className="w-full" onClick={handleSaveMiles}>
                  💾 บันทึกเลขไมล์
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      
        <Dialog open={!!editBooking} onOpenChange={() => setEditBooking(null)}>
          <DialogContent className="w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>แก้ไขการจอง</DialogTitle>
            </DialogHeader>

            {editBooking && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()

                  // ✅ รวมช่วงเวลาที่เลือกไว้เป็น string เดียว
                  const newTimeSlots = TIME_SLOTS
                    .filter(slot => selectedEditTimes.includes(slot))
                    .join(', ')

                  // ✅ ตรวจสอบว่ามีการเลือกเวลาหรือยัง
                  if (!newTimeSlots) {
                    alert('กรุณาเลือกช่วงเวลาอย่างน้อย 1 ช่วง')
                    return
                  }

                  // ✅ ตรวจสอบเวลาที่ซ้ำกับคนอื่น (แต่ไม่นับรายการตัวเอง)
                  const { data: checkData, error: checkError } = await supabase
                    .from('bookings')
                    .select('id, time_slot')
                    .eq('car_id', editBooking.car_id)
                    .eq('date', editForm.date.toISOString().split('T')[0])

                  if (checkError) {
                    console.error('Error checking bookings:', checkError)
                    alert('ไม่สามารถตรวจสอบเวลาว่างได้')
                    return
                  }

                  // ✅ ตรวจสอบว่าช่วงเวลาที่เลือกไปซ้ำกับของคนอื่นไหม
                  const conflict = checkData?.some(b => {
                    if (b.id === editBooking.id) return false // ข้ามของตัวเอง
                    const booked = b.time_slot.split(',').map(s => s.trim())
                    return booked.some(slot => selectedEditTimes.includes(slot))
                  })

                  if (conflict) {
                    alert('บางช่วงเวลาที่เลือกถูกจองแล้ว กรุณาเลือกเวลาใหม่')
                    return
                  }

                  // ✅ อัปเดตข้อมูล
                  const { error } = await supabase
                    .from('bookings')
                    .update({
                      driver_name: editForm.driver_name,
                      destination: editForm.destination,
                      reason: editForm.reason,
                      time_slot: newTimeSlots,
                      date: editForm.date.toLocaleDateString('sv-SE'), // ✅ ใช้ format มาตรฐาน YYYY-MM-DD
                    })
                    .eq('id', editBooking.id)
                    .eq('user_id', user.id) // ป้องกันไม่ให้แก้ของคนอื่น

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
                  onChange={(e) =>
                    setEditForm({ ...editForm, driver_name: e.target.value })
                  }
                />

                <label className="block text-sm font-medium">สถานที่</label>
                <Input
                  value={editForm.destination}
                  onChange={(e) =>
                    setEditForm({ ...editForm, destination: e.target.value })
                  }
                />

                <label className="block text-sm font-medium">เหตุผล</label>
                <Input
                  value={editForm.reason}
                  onChange={(e) =>
                    setEditForm({ ...editForm, reason: e.target.value })
                  }
                />

                {/* ✅ ส่วนเลือกช่วงเวลาใหม่ */}
                {/* ✅ ส่วนเลือกวันที่ใหม่ */}
                <label className="block text-sm font-medium">วันที่</label>
                <DatePicker
                  selected={editForm.date}
                  onChange={(d: Date | null) => {
                    if (d) setEditForm({ ...editForm, date: d })
                  }}
                  dateFormat="dd/MM/yyyy"
                  className="border rounded-md p-2 w-full"
                />

                <label className="block text-sm font-medium">ช่วงเวลาที่ต้องการแก้ไข</label>
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

      </main>
      </div>
    </>
  )
}

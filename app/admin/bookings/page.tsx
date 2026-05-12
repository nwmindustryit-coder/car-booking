'use client'
import { useEffect, useState, useMemo } from 'react'
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
import { EyeIcon, Search, Activity, AlertCircle, CalendarDays, Filter, RefreshCw, Trash2, SquarePen, Moon, Sun, CheckCircle2, AlertTriangle, Save, CarFront } from 'lucide-react'

export default function AdminBookings() {
    const [bookings, setBookings] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('all') 

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
    const [editStartMile, setEditStartMile] = useState('')
    const [editEndMile, setEditEndMile] = useState('')

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

    const TIME_SLOTS = [
        'ก่อนเวลางาน', '08:00-09:00', '09:01-10:00', '10:01-11:00',
        '11:01-12:00', '13:00-14:00', '14:01-15:00', '15:01-16:00',
        '16:01-17:00', 'หลังเวลางาน',
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

        for (let i = 1; i < indexes.length; i++) {
            if (indexes[i] === indexes[i - 1] + 1) {
                currentGroup.push(indexes[i])
            } else {
                groups.push(currentGroup)
                currentGroup = [indexes[i]]
            }
        }
        groups.push(currentGroup)

        const formattedGroups = groups.map(group => {
            const firstSlot = TIME_SLOTS[group[0]]
            const lastSlot = TIME_SLOTS[group[group.length - 1]]
            if (group.length === 1) return firstSlot
            if (firstSlot === 'ก่อนเวลางาน') return `ก่อนเวลางาน-${lastSlot.split('-').pop()}`
            if (lastSlot === 'หลังเวลางาน') return `${firstSlot.split('-')[0]}-หลังเวลางาน`
            return `${firstSlot.split('-')[0]}-${lastSlot.split('-').pop()}`
        })
        return formattedGroups.join(' และ ')
    }

    const loadBookings = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from("bookings")
            .select(`
    *,
    miles:miles!miles_booking_id_fkey(
    id,
      start_mile,
      end_mile,
      total_mile
    ),
    cars(plate)
    )
  `)
            .order("date", { ascending: false })

        if (error) {
            console.error("Error loading bookings:", error)
            setIsLoading(false)
            return
        }

        const mapped = data.map((b: any) => ({
            ...b,
            miles_status: b.miles ? "recorded" : "missing",
            total_mile: b.miles?.total_mile ?? null,
        }))

        setBookings(mapped)
        setIsLoading(false)
    }

    useEffect(() => {
        if (editBooking) {
            const loadMiles = async () => {
                const { data } = await supabase
                    .from("miles")
                    .select("start_mile, end_mile")
                    .eq("booking_id", editBooking.id)
                    .maybeSingle()

                if (data) {
                    setEditStartMile(data.start_mile?.toString() || "")
                    setEditEndMile(data.end_mile?.toString() || "")
                } else {
                    setEditStartMile("")
                    setEditEndMile("")
                }
            }
            loadMiles()
        }
    }, [editBooking])

    const deleteBooking = async (id: number) => {
        if (!confirm('ต้องการลบการจองนี้หรือไม่?')) return
        const { error } = await supabase.from('bookings').delete().eq('id', id)
        if (error) alert(error.message)
        else loadBookings()
    }

    useEffect(() => { loadBookings() }, [])

    useEffect(() => {
        const checkBookingAvailability = async () => {
            if (!editBooking?.car_id || !editForm.date) return
            const { data, error } = await supabase
                .from('bookings')
                .select('time_slot, driver_name')
                .eq('car_id', editBooking.car_id)
                .eq('date', editForm.date.toISOString().split('T')[0])

            if (error) return console.error('Error loading booking availability:', error)

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

    useEffect(() => {
        if (editBooking) setSelectedEditTimes([])
    }, [editForm.date])

    const availableMonths = useMemo(() => {
        const months = new Set<string>()
        bookings.forEach(b => {
            const d = new Date(b.date)
            const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            months.add(yearMonth)
        })
        return Array.from(months).sort().reverse() 
    }, [bookings])

    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            const matchesSearch = 
                b.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.cars?.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
            
            let matchesMonth = true;
            if (selectedMonth !== 'all') {
                const d = new Date(b.date);
                const bookingMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                matchesMonth = bookingMonth === selectedMonth;
            }

            return matchesSearch && matchesMonth;
        })
    }, [bookings, searchTerm, selectedMonth])

    const stats = {
        total: filteredBookings.length,
        missingMiles: filteredBookings.filter(b => b.miles_status === 'missing').length,
        today: filteredBookings.filter(b => isToday(new Date(b.date))).length
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 transition-colors duration-300">
            <Navbar />
            <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
                
                {/* Header & Dashboard Cards */}
                <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h1 className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">
                            จัดการการจองทั้งหมด (แอดมิน)
                        </h1>
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">การจอง (ที่แสดง)</CardTitle>
                                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-800 dark:text-white">{stats.total}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">รอลงเลขไมล์</CardTitle>
                                <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.missingMiles}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">คิวใช้งานวันนี้</CardTitle>
                                <CalendarDays className="h-4 w-4 text-green-600 dark:text-emerald-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600 dark:text-emerald-400">{stats.today}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ✅ Search Bar & Month Filter */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm mb-4 flex flex-col sm:flex-row gap-4 justify-between items-center border border-slate-100 dark:border-slate-700 transition-colors">
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto flex-1">
                            {/* ช่องค้นหา */}
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                                <Input 
                                    placeholder="ค้นหาชื่อผู้ขับ, สถานที่, ทะเบียน..." 
                                    className="pl-10 w-full bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 dark:text-white dark:placeholder-slate-400 transition-colors"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* ✅ Dropdown เลือกเดือน */}
                            <div className="relative w-full sm:w-64">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="pl-10 w-full h-10 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 appearance-none transition-colors"
                                >
                                    <option value="all">ดูทั้งหมด (All Time)</option>
                                    {availableMonths.map(monthKey => {
                                        const [year, month] = monthKey.split('-');
                                        const date = new Date(Number(year), Number(month) - 1);
                                        return (
                                            <option key={monthKey} value={monthKey}>
                                                {format(date, 'MMMM yyyy', { locale: th })}
                                            </option>
                                        )
                                    })}
                                </select>
                            </div>
                        </div>

                        <Button variant="outline" onClick={loadBookings} disabled={isLoading} className="w-full sm:w-auto bg-white dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" /> รีเฟรชข้อมูล
                        </Button>
                    </div>
                </div>

                {/* ตาราง UI แบบดั้งเดิม */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden border border-slate-200 dark:border-slate-700 transition-colors">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center">
                            <Activity className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mb-2" />
                            <p>กำลังโหลดข้อมูล...</p>
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                            ไม่พบข้อมูลการจอง
                        </div>
                    ) : (
                        Object.entries(
                            filteredBookings.reduce((groups, booking) => {
                                const date = new Date(booking.date).toISOString().split("T")[0]
                                if (!groups[date]) groups[date] = []
                                groups[date].push(booking)
                                return groups
                            }, {} as Record<string, any[]>)
                        )
                            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                            .map(([date, group]: [string, any[]]) => {
                                const d = new Date(date)
                                const month = d.getMonth()
                                const isEvenMonth = month % 2 === 0

                                const bgColor = isToday(d)
                                    ? "bg-emerald-600 dark:bg-emerald-700"
                                    : isEvenMonth
                                        ? "bg-slate-700 dark:bg-slate-800/90"
                                        : "bg-slate-600 dark:bg-slate-700"

                                return (
                                    <div key={date} className="border-b dark:border-slate-700 last:border-none">
                                        <div className={`px-4 py-2 text-sm sm:text-base font-semibold text-white flex justify-between items-center ${bgColor} transition-colors`}>
                                            <div className="flex items-center gap-2">
                                                <CalendarDays className="w-4 h-4" />
                                                <span>
                                                  {format(d, "dd MMMM yyyy", { locale: th })}{" "}
                                                  {isToday(d) && "(วันนี้)"}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-200 dark:text-slate-300">
                                                ({group.length.toLocaleString("th-TH")} รายการ)
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs sm:text-sm min-w-[700px]">
                                                <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 transition-colors">
                                                    <tr>
                                                        <th className="p-2 sm:p-3 text-left font-medium">อีเมลผู้จอง</th>
                                                        <th className="p-2 sm:p-3 font-medium">ชื่อผู้ขับ</th>
                                                        <th className="p-2 sm:p-3 font-medium">ทะเบียนรถ</th>
                                                        <th className="p-2 sm:p-3 font-medium">ช่วงเวลา</th>
                                                        <th className="p-2 sm:p-3 font-medium text-left">สถานที่</th>
                                                        <th className="p-2 sm:p-3 font-medium text-left">เหตุผล</th>
                                                        <th className="p-2 sm:p-3 font-medium">เลขไมล์</th>
                                                        <th className="p-2 sm:p-3 font-medium">ดู</th>
                                                        <th className="p-2 sm:p-3 text-center font-medium">จัดการ</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                    {group.map((b: any) => (
                                                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 transition-colors">
                                                            <td className="p-2 sm:p-3">{b.user_name}</td>
                                                            <td className="p-2 sm:p-3 text-center font-medium">{b.driver_name}</td>
                                                            <td className="p-2 sm:p-3 text-center">
                                                                <Badge variant="outline" className="bg-white dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 font-normal shadow-sm">
                                                                    {b.cars?.plate}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-2 sm:p-3 text-center text-slate-500 dark:text-slate-400">
                                                                {mergeTimeSlots(b.time_slot)}
                                                            </td>
                                                            <td className="p-2 sm:p-3 truncate max-w-[150px]">{b.destination}</td>
                                                            <td className="p-2 sm:p-3 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{b.reason}</td>
                                                            <td className="p-2 sm:p-3 text-center">
                                                                {b.miles_status === "recorded" ? (
                                                                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md text-xs font-medium border border-emerald-100 dark:border-emerald-800/50">
                                                                        <CheckCircle2 className="w-3.5 h-3.5" /> บันทึกแล้ว ({b.total_mile} กม.)
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-orange-600 dark:text-amber-400 bg-orange-50 dark:bg-amber-900/30 px-2 py-1 rounded-md text-xs font-medium border border-orange-100 dark:border-amber-800/50">
                                                                        <AlertTriangle className="w-3.5 h-3.5" /> ยังไม่ได้บันทึก
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-2 sm:p-3 text-center">
                                                                <Button size="sm" variant="outline" onClick={async () => {
                                                                    const { data: milesData, error } = await supabase
                                                                        .from("miles")
                                                                        .select("start_mile, end_mile, total_mile")
                                                                        .eq("booking_id", b.id)
                                                                        .limit(1)
                                                                        .maybeSingle()
                                                                    if (error) console.error("Error loading miles:", error)
                                                                    setShowDetail({ ...b, miles: milesData || null })
                                                                }} className="h-8 px-2 text-slate-600 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">
                                                                    <EyeIcon className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">ดู</span>
                                                                </Button>
                                                            </td>
                                                            <td className="p-2 sm:p-3 text-center">
                                                              <div className="flex items-center justify-center gap-1.5">
                                                                <Button size="sm" variant="ghost" onClick={() => {
                                                                    setEditForm({ driver_name: b.driver_name, destination: b.destination, reason: b.reason, date: new Date(b.date) })
                                                                    setSelectedEditTimes(b.time_slot.split(",").map((s: string) => s.trim()))
                                                                    setEditBooking(b)
                                                                }}
                                                                className="h-8 w-8 p-0 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30">
                                                                    <SquarePen className="w-4 h-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="sm" onClick={() => deleteBooking(b.id)} className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                              </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )
                            })
                    )}
                </div>

                {/* Dialog แสดงรายละเอียด */}
                <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
                    <DialogContent className="max-w-md dark:bg-slate-800 dark:border-slate-700 rounded-2xl">
                        <DialogHeader className="border-b dark:border-slate-700 pb-3">
                            <DialogTitle className="text-slate-800 dark:text-white">รายละเอียดการจอง</DialogTitle>
                        </DialogHeader>
                        {showDetail && (
                            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 pt-2">
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">อีเมลผู้จอง:</span>
                                    <span className="col-span-2">{showDetail.user_name}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">ชื่อผู้ขับ:</span>
                                    <span className="col-span-2 font-medium text-slate-900 dark:text-white">{showDetail.driver_name}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 items-center">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">ทะเบียนรถ:</span>
                                    <span className="col-span-2">
                                      <Badge variant="outline" className="bg-slate-50 dark:bg-slate-700 dark:border-slate-600 shadow-sm font-normal">
                                        {showDetail.cars?.plate}
                                      </Badge>
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">วันที่:</span>
                                    <span className="col-span-2">{showDetail.date}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">ช่วงเวลา:</span>
                                    <span className="col-span-2">{showDetail.time_slot}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">สถานที่:</span>
                                    <span className="col-span-2">{showDetail.destination}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">เหตุผล:</span>
                                    <span className="col-span-2 text-slate-500 dark:text-slate-400">{showDetail.reason || "-"}</span>
                                </div>
                                
                                {showDetail.miles ? (
                                    <div className="pt-4 border-t dark:border-slate-700 mt-2 space-y-2">
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="font-semibold text-slate-500 dark:text-slate-400">เลขไมล์เริ่มต้น:</span>
                                            <span className="col-span-2 font-mono bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded inline-block w-max border dark:border-slate-700">{showDetail.miles.start_mile}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="font-semibold text-slate-500 dark:text-slate-400">เลขไมล์สิ้นสุด:</span>
                                            <span className="col-span-2 font-mono bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded inline-block w-max border dark:border-slate-700">{showDetail.miles.end_mile}</span>
                                        </div>
                                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg flex items-center justify-between">
                                            <span className="text-blue-800 dark:text-blue-300 font-semibold flex items-center gap-2">
                                                <CarFront className="w-4 h-4" /> ระยะทางที่ใช้
                                            </span>
                                            <span className="text-blue-700 dark:text-blue-400 font-bold text-lg">
                                                {showDetail.miles.total_mile ?? showDetail.miles.end_mile - showDetail.miles.start_mile} กม.
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-4 border-t dark:border-slate-700 mt-2">
                                        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-lg p-3 text-center">
                                            <p className="text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2 text-sm">
                                                <AlertCircle className="w-4 h-4" /> ยังไม่ได้บันทึกเลขไมล์
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </main>

            {/* Dialog แก้ไข */}
            <Dialog open={!!editBooking} onOpenChange={() => setEditBooking(null)}>
                <DialogContent className="max-w-md dark:bg-slate-800 dark:border-slate-700 rounded-2xl">
                    <DialogHeader className="border-b dark:border-slate-700 pb-3">
                        <DialogTitle className="text-slate-800 dark:text-white flex items-center gap-2">
                            <SquarePen className="w-5 h-5 text-blue-600 dark:text-blue-400" /> แก้ไขการจอง
                        </DialogTitle>
                    </DialogHeader>
                    {editBooking && (
                        <form onSubmit={async (e) => {
                            e.preventDefault()
                            const newTimeSlots = TIME_SLOTS.filter(slot => selectedEditTimes.includes(slot)).join(', ')
                            if (!newTimeSlots) return alert('กรุณาเลือกช่วงเวลาอย่างน้อย 1 ช่วง')

                            const { data: checkData } = await supabase.from('bookings').select('id, time_slot').eq('car_id', editBooking.car_id).eq('date', editForm.date.toISOString().split('T')[0])
                            const conflict = checkData?.some(b => {
                                if (b.id === editBooking.id) return false
                                const booked = b.time_slot.split(',').map(s => s.trim())
                                return booked.some(slot => selectedEditTimes.includes(slot))
                            })
                            if (conflict) return alert('บางช่วงเวลาที่เลือกถูกจองแล้ว กรุณาเลือกเวลาใหม่')

                            const { error } = await supabase.from('bookings').update({
                                driver_name: editForm.driver_name, destination: editForm.destination, reason: editForm.reason,
                                date: editForm.date.toLocaleDateString('sv-SE'), time_slot: newTimeSlots,
                            }).eq('id', editBooking.id)

                            if (editStartMile && editEndMile) {
                                const { error: milesError } = await supabase.from("miles").upsert({
                                    booking_id: editBooking.id, start_mile: Number(editStartMile), end_mile: Number(editEndMile)
                                }, { onConflict: "booking_id" })
                                if (milesError) return alert("ไม่สามารถอัปเดตเลขไมล์ได้: " + milesError.message)
                            }

                            if (error) alert(error.message)
                            else { alert('อัปเดตข้อมูลเรียบร้อย'); setEditBooking(null); loadBookings() }
                        }} className="space-y-4 pt-2">
                            
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อผู้ขับ</label>
                                <Input value={editForm.driver_name} onChange={(e) => setEditForm({ ...editForm, driver_name: e.target.value })} className="dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">สถานที่</label>
                                <Input value={editForm.destination} onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })} className="dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">เหตุผล</label>
                                <Input value={editForm.reason} onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} className="dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">วันที่</label>
                                <DatePicker selected={editForm.date} onChange={(d: Date | null) => d && setEditForm({ ...editForm, date: d })} dateFormat="dd/MM/yyyy" className="border border-slate-200 dark:border-slate-600 rounded-md p-2 w-full bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            
                            <div className="border-t dark:border-slate-700 pt-4 space-y-3">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">เลขไมล์เริ่มต้น</label>
                                    <Input type="number" value={editStartMile} onChange={(e) => setEditStartMile(e.target.value)} placeholder="เลขไมล์เริ่มต้น" className="font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">เลขไมล์สิ้นสุด</label>
                                    <Input type="number" value={editEndMile} onChange={(e) => setEditEndMile(e.target.value)} placeholder="เลขไมล์สิ้นสุด" className="font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">ช่วงเวลา</label>
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
                                                        setSelectedEditTimes((prev) => prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot])
                                                    }
                                                }} 
                                                disabled={isBooked && bookedBy !== editForm.driver_name} 
                                                className={`flex items-center justify-center gap-1 text-xs sm:text-sm ${
                                                    isSelected ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 dark:bg-blue-500' 
                                                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                                                }`}
                                            >
                                                <span className="truncate">{slot}</span>
                                                {isBooked ? (
                                                    <span className="ml-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-[10px] rounded-md font-semibold truncate max-w-[60px]">{bookedBy}</span>
                                                ) : (
                                                    <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] rounded-md font-semibold">ว่าง</span>
                                                )}
                                            </Button>
                                        )
                                    })}
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white mt-4 flex items-center justify-center gap-2">
                                <Save className="w-4 h-4" /> บันทึกการแก้ไข
                            </Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
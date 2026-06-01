"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  Car, 
  MapPin, 
  Users, 
  Clock, 
  ArrowLeft, 
  Download,
  Filter,
  CalendarDays,
  Sparkles,
  AlertTriangle,
  Info,
  Lightbulb
} from "lucide-react";
import Link from "next/link";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { th } from "date-fns/locale";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [timeRange, setTimeType] = useState<"3months" | "6months" | "year">("3months");
  const [aiInsights, setAIInsights] = useState<{ text: string, type: "car" | "time" | "distance" | "trend" }[]>([]);

  const generateAIInsights = (bookings: any[]) => {
    const insights: { text: string, type: "car" | "time" | "distance" | "trend" }[] = [];
    if (bookings.length === 0) return [];

    // 1. วิเคราะห์รถที่ทำงานหนักที่สุด
    const carTrips: Record<string, number> = {};
    bookings.forEach(b => {
      const plate = b.cars?.plate || "ไม่ระบุ";
      carTrips[plate] = (carTrips[plate] || 0) + 1;
    });
    const topCar = Object.entries(carTrips).sort((a, b) => b[1] - a[1])[0];
    if (topCar) {
      insights.push({
        text: `รถทะเบียน [${topCar[0]}] ถูกใช้งานหนักที่สุดในรอบนี้ (${topCar[1]} ทริป) แนะนำให้ตรวจสอบระบบหล่อลื่นและลมยางเป็นพิเศษครับ`,
        type: "car"
      });
    }

    // 2. วิเคราะห์ Peak Time
    const timeMap: Record<string, number> = {};
    bookings.forEach(b => {
      const slots = b.time_slot?.split(",") || [];
      slots.forEach((s: string) => {
        const clean = s.trim();
        timeMap[clean] = (timeMap[clean] || 0) + 1;
      });
    });
    const peakTime = Object.entries(timeMap).sort((a, b) => b[1] - a[1])[0];
    if (peakTime && peakTime[1] > 5) {
      insights.push({
        text: `ช่วงเวลา [${peakTime[0]}] มีความหนาแน่นสูงสุดในระบบ แนะนำให้ Admin ลองกระจายคิวไปช่วงเวลาอื่นเพื่อลดการรอคอยครับ`,
        type: "time"
      });
    }

    // 3. วิเคราะห์ทริปทางไกล
    const longDistance = bookings.filter(b => (b.distance || 0) > 100).length;
    if (longDistance > 3) {
      insights.push({
        text: `ตรวจพบทริปวิ่งระยะไกล (${longDistance} ครั้ง) มากกว่าปกติ แนะนำให้พนักงานตรวจสอบความพร้อมของหม้อน้ำก่อนออกเดินทางทุกครั้งครับ`,
        type: "distance"
      });
    }

    // 4. สรุปภาพรวม
    if (bookings.length > 20) {
      insights.push({
        text: `ภาพรวมการใช้งานรถในองค์กรมีความสม่ำเสมอดีเยี่ยม ระบบยังคงรองรับปริมาณงานได้เพียงพอในขณะนี้ครับ`,
        type: "trend"
      });
    }

    return insights;
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      let startDate;
      if (timeRange === "3months") startDate = subMonths(now, 3);
      else if (timeRange === "6months") startDate = subMonths(now, 6);
      else startDate = subMonths(now, 12);

      const startStr = format(startOfMonth(startDate), "yyyy-MM-dd");

      const [bookingsRes, carsRes, milesRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("*, profiles(department), cars(plate)")
          .gte("date", startStr)
          .order("date", { ascending: true }),
        supabase.from("cars").select("*"),
        supabase.from("miles").select("*, bookings(car_id, date)")
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      
      // Process Data
      setCars(carsRes.data || []);
      
      const enrichedBookings = (bookingsRes.data || []).map(b => {
        const mileInfo = (milesRes.data || []).find(m => m.booking_id === b.id);
        const distance = mileInfo ? (mileInfo.end_mile - mileInfo.start_mile) : 0;
        return { ...b, distance };
      });

      setData(enrichedBookings);
      setAIInsights(generateAIInsights(enrichedBookings));
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  // 📈 Analytics Calculations
  const stats = useMemo(() => {
    const totalTrips = data.length;
    const totalDistance = data.reduce((sum, b) => sum + (b.distance || 0), 0);
    const avgDistance = totalTrips > 0 ? (totalDistance / totalTrips).toFixed(1) : 0;
    
    // Top Car
    const carMap: Record<string, number> = {};
    data.forEach(b => {
      const plate = b.cars?.plate || "ไม่ระบุ";
      carMap[plate] = (carMap[plate] || 0) + 1;
    });
    const topCar = Object.entries(carMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    return { totalTrips, totalDistance, avgDistance, topCar };
  }, [data]);

  // 📊 Chart: Trips by Car
  const carUsageChartData = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(b => {
      const plate = b.cars?.plate || "ไม่ระบุ";
      map[plate] = (map[plate] || 0) + 1;
    });

    return {
      labels: Object.keys(map),
      datasets: [{
        label: 'จำนวนครั้งที่ใช้',
        data: Object.values(map),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(6, 182, 212, 0.8)',
        ],
        borderRadius: 8,
      }]
    };
  }, [data]);

  // 📊 Chart: Usage Trend (Monthly)
  const monthlyTrendData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), timeRange === "3months" ? 2 : timeRange === "6months" ? 5 : 11),
      end: new Date()
    });

    const labels = months.map(m => format(m, "MMM yy", { locale: th }));
    const tripCounts = months.map(m => {
      const mStr = format(m, "yyyy-MM");
      return data.filter(b => b.date.startsWith(mStr)).length;
    });

    return {
      labels,
      datasets: [{
        fill: true,
        label: 'จำนวนการจอง',
        data: tripCounts,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      }]
    };
  }, [data, timeRange]);

  // 📊 Heatmap-like: Peak Time Analysis
  const peakTimeData = useMemo(() => {
    const timeMap: Record<string, number> = {};
    data.forEach(b => {
      const slots = b.time_slot?.split(",") || [];
      slots.forEach((s: string) => {
        const clean = s.trim();
        timeMap[clean] = (timeMap[clean] || 0) + 1;
      });
    });

    const sortedSlots = [
      "ก่อนเวลางาน", "08:00-09:00", "09:01-10:00", "10:01-11:00",
      "11:01-12:00", "13:00-14:00", "14:01-15:00", "15:01-16:00",
      "16:01-17:00", "หลังเวลางาน"
    ];

    return {
      labels: sortedSlots,
      datasets: [{
        label: 'ความถี่การใช้งาน',
        data: sortedSlots.map(s => timeMap[s] || 0),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderRadius: 4,
      }]
    };
  }, [data]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, grid: { display: false } },
      x: { grid: { display: false } }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Navbar />
      
      <main className="p-4 sm:p-6 max-w-7xl mx-auto pt-24 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/admin" className="flex items-center text-sm text-slate-500 hover:text-blue-600 transition-colors w-fit">
              <ArrowLeft className="w-4 h-4 mr-1" /> กลับไปหน้าแผงควบคุม
            </Link>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-blue-600" /> วิเคราะห์การใช้งานรถ
            </h1>
            <p className="text-slate-500 dark:text-slate-400">ข้อมูลเชิงลึกเพื่อการวางแผนจัดการกองรถอย่างมีประสิทธิภาพ</p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-2xl border dark:border-slate-700 shadow-sm">
            <button 
              onClick={() => setTimeType("3months")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${timeRange === "3months" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
            >
              3 เดือน
            </button>
            <button 
              onClick={() => setTimeType("6months")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${timeRange === "6months" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
            >
              6 เดือน
            </button>
            <button 
              onClick={() => setTimeType("year")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${timeRange === "year" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
            >
              1 ปี
            </button>
          </div>
        </div>

        {/* AI Smart Summary Box */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-600 to-blue-700 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
            <Sparkles className="w-32 h-32 text-white" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300" /> 
              AI สรุปข้อมูลวิเคราะห์รายสัปดาห์
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            {loading ? (
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-white/20 animate-pulse rounded" />
                <div className="h-4 w-1/2 bg-white/20 animate-pulse rounded" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiInsights.map((insight, idx) => (
                  <div key={idx} className="flex gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:bg-white/20 transition-all group">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
                      {insight.type === "car" && <Car className="w-4 h-4" />}
                      {insight.type === "time" && <Clock className="w-4 h-4" />}
                      {insight.type === "distance" && <MapPin className="w-4 h-4" />}
                      {insight.type === "trend" && <TrendingUp className="w-4 h-4" />}
                    </div>
                    <p className="text-sm leading-relaxed text-indigo-50 font-medium">{insight.text}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm dark:bg-slate-800 transition-all hover:shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">จำนวนทริปรวม</p>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.totalTrips} <span className="text-sm font-medium text-slate-400">ทริป</span></h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm dark:bg-slate-800 transition-all hover:shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ระยะทางรวม</p>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.totalDistance.toLocaleString()} <span className="text-sm font-medium text-slate-400">กม.</span></h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm dark:bg-slate-800 transition-all hover:shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">เฉลี่ยต่อทริป</p>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.avgDistance} <span className="text-sm font-medium text-slate-400">กม.</span></h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm dark:bg-slate-800 transition-all hover:shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">รถที่ใช้บ่อยสุด</p>
                <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight mt-0.5">{stats.topCar}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <Card className="border-none shadow-sm dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" /> แนวโน้มการใช้งานรายเดือน
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <div className="h-full flex items-center justify-center animate-pulse bg-slate-100 dark:bg-slate-700/30 rounded-xl" />
              ) : (
                <Line data={monthlyTrendData} options={chartOptions} />
              )}
            </CardContent>
          </Card>

          {/* Usage by Car Chart */}
          <Card className="border-none shadow-sm dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-500" /> สัดส่วนการใช้รถแยกตามคัน
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
               {loading ? (
                <div className="h-full flex items-center justify-center animate-pulse bg-slate-100 dark:bg-slate-700/30 rounded-xl" />
              ) : (
                <Bar data={carUsageChartData} options={chartOptions} />
              )}
            </CardContent>
          </Card>

          {/* Peak Time Analysis */}
          <Card className="border-none shadow-sm dark:bg-slate-800 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" /> ช่วงเวลาที่มีการใช้งานหนาแน่น (Peak Time)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
               {loading ? (
                <div className="h-full flex items-center justify-center animate-pulse bg-slate-100 dark:bg-slate-700/30 rounded-xl" />
              ) : (
                <Bar 
                  data={peakTimeData} 
                  options={{
                    ...chartOptions,
                    indexAxis: 'y' as const,
                  }} 
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Informational Footer */}
        <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
          <div className="relative z-10 space-y-2">
            <h2 className="text-2xl font-black">ต้องการรายงานแบบละเอียด?</h2>
            <p className="text-blue-100 max-w-xl">คุณสามารถส่งออกข้อมูลเป็นไฟล์ Excel เพื่อนำไปวิเคราะห์ต่อ หรือจัดทำงบประมาณประจำปีได้ที่เมนู "รายงานการใช้รถ"</p>
            <Link href="/admin/reports">
              <Button className="mt-4 bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl h-11 px-6 shadow-lg shadow-black/10">
                ไปหน้าออกรายงาน <Download className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
          <BarChart3 className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-blue-500/30 rotate-12" />
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Clock,
  User,
  Moon,
  Sun,
  FileText,
  Pencil,
  Activity,
  ShieldAlert,
  Search,
  ArrowLeft,
} from "lucide-react";

import { useWorkouts } from "@/hooks/useWorkouts";
import { Workout } from "@/types/workout";
import { WorkOutForm } from "./components/WorkOutForm";
import { WorkOutTable } from "./components/WorkOutTable";
import { MonthFilter } from "./components/MonthFilter";

export default function WorkOutPage() {
  const [viewMode, setViewMode] = useState<'user' | 'admin'>('user');
  const { user, profile, rows, loading, remove, refresh } = useWorkouts(viewMode);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  
  const router = useRouter();
  const isAdmin = profile?.role === 'admin';

  // Dark Mode Logic
  useEffect(() => {
    const savedTheme = localStorage.getItem("dashboardTheme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("dashboardTheme", newTheme ? "dark" : "light");
  };

  // Filter Logic
  const availableMonths = useMemo(() => {
    const monthsSet = new Set(rows.map((r) => r.date.substring(0, 7)));
    return Array.from(monthsSet).sort().reverse();
  }, [rows]);

  useEffect(() => {
    if (availableMonths.length > 0 && selectedMonthFilter === "all") {
       // Optional: Auto-select latest month if you want
       // setSelectedMonthFilter(availableMonths[0]);
    }
  }, [availableMonths]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchMonth = selectedMonthFilter === "all" || r.date.startsWith(selectedMonthFilter);
      const matchSearch =
        r.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.location?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchMonth && matchSearch;
    });
  }, [rows, selectedMonthFilter, searchQuery]);

  const totalAmount = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [filteredRows]);

  const handleEdit = (workout: Workout) => {
    setEditingWorkout(workout);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSuccess = () => {
    setEditingWorkout(null);
    refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <Navbar />
        <main className="flex flex-col items-center justify-center h-[80vh]">
          <div className="p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex flex-col items-center border dark:border-slate-700">
            <Activity className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
            <p className="text-slate-600 dark:text-slate-300 font-medium text-lg">กำลังโหลดข้อมูล...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-12 transition-colors duration-300">
      <Navbar />
      <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 mt-4">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              บันทึกเวลาทำงานนอกสถานที่
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              ระบบบันทึกเวลาเพื่อคำนวณเบี้ยเลี้ยงการปฏิบัติงานนอกพื้นที่
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={toggleTheme} variant="outline" className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
              {isDarkMode ? <Sun className="w-4 h-4 mr-2 text-amber-400" /> : <Moon className="w-4 h-4 mr-2 text-indigo-500" />}
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </Button>
            <Button variant="outline" onClick={() => router.push("/")} className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700">
              <ArrowLeft className="w-4 h-4 mr-2" /> กลับหน้าหลัก
            </Button>
            <Button onClick={() => router.push("/work-out/report")} className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-sm">
              <FileText className="w-4 h-4 mr-2" /> ออกรายงาน
            </Button>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 inline-flex transition-colors">
            <button
              onClick={() => setViewMode('user')}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'user' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <User className="w-4 h-4" /> มุมมองของคุณ
            </button>
            <button
              onClick={() => setViewMode('admin')}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'admin' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <ShieldAlert className="w-4 h-4" /> มุมมองแอดมิน
            </button>
          </div>
        )}

        <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-800 transition-colors">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 pb-4">
            <CardTitle className="text-lg text-slate-800 dark:text-white flex items-center gap-2">
              {editingWorkout ? (
                <><Pencil className="w-5 h-5 text-amber-600 dark:text-amber-500" /> แก้ไขข้อมูลการปฏิบัติงาน</>
              ) : (
                <><FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" /> ฟอร์มบันทึกการปฏิบัติงาน</>
              )}
            </CardTitle>
          </CardHeader>
          <WorkOutForm 
            userId={user.id}
            initialData={editingWorkout}
            department={profile?.department || ""}
            employeeName={user.user_metadata?.full_name || ""}
            onSuccess={handleSuccess}
            onCancel={() => setEditingWorkout(null)}
          />
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-800 transition-colors">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4">
            <div>
              <CardTitle className="text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                {viewMode === 'admin' ? "ประวัติการปฏิบัติงาน (พนักงานทั้งหมด)" : "ประวัติการปฏิบัติงานของคุณ"}
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input
                  placeholder="ค้นหาชื่อ / สถานที่"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400 rounded-lg h-9"
                />
              </div>
              <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 px-4 py-1.5 text-sm font-bold whitespace-nowrap">
                ยอดรวมเบี้ยเลี้ยง: {totalAmount.toLocaleString()} ฿
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <MonthFilter 
              availableMonths={availableMonths} 
              selectedMonth={selectedMonthFilter} 
              onSelectMonth={setSelectedMonthFilter} 
            />

            {filteredRows.length === 0 ? (
              <div className="p-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
                <FileText className="w-12 h-12 text-slate-200 dark:text-slate-600 mb-3"/>
                <p>ไม่พบประวัติการบันทึกข้อมูล</p>
              </div>
            ) : (
              <WorkOutTable 
                rows={filteredRows}
                viewMode={viewMode}
                isAdmin={isAdmin}
                currentUserId={user.id}
                onEdit={handleEdit}
                onDelete={remove}
              />
            )}
          </CardContent>
        </Card>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `,
        }}
      />
    </div>
  );
}

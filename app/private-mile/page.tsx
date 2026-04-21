"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Pencil, Trash2, FileText, ArrowLeft } from "lucide-react";

const RATE_PER_KM = 5;

// ✅ แก้ให้เป็น email admin จริงของคุณ
const ADMIN_EMAILS = ["theeraphat@nawamit.com"];

type MileageRow = {
  id: string;
  user_id: string;
  date: string; // ISO date string
  location: string;
  start_mile: number;
  end_mile: number;
  remark: string | null;
  distance?: number | null;
  amount?: number | null;
  employee_name?: string | null;
  created_at?: string;
};

type User = {
  id: string;
  email?: string;
};

export default function PrivateMileagePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [rows, setRows] = useState<MileageRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);

  const [date, setDate] = useState<Date | null>(new Date());
  const [location, setLocation] = useState("");
  const [startMile, setStartMile] = useState("");
  const [endMile, setEndMile] = useState("");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [employeeName, setEmployeeName] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  const router = useRouter();

  const isAdmin = useMemo(
    () => !!user?.email && ADMIN_EMAILS.includes(user.email),
    [user],
  );

  // ✅ โหลด user
  useEffect(() => {
    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.push("/login");
        return;
      }
      setUser({ id: data.user.id, email: data.user.email ?? undefined });
      setLoadingUser(false);
    };
    loadUser();
  }, [router]);

  // ✅ โหลดข้อมูล mileage
  useEffect(() => {
    if (!user) return;

    const loadRows = async () => {
      setLoadingRows(true);
      let query = supabase
        .from("mileages")
        .select("*")
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error loading mileages:", error);
      } else {
        setRows(data || []);
      }
      setLoadingRows(false);
    };

    loadRows();
  }, [user, isAdmin]);

  const resetForm = () => {
    setDate(new Date());
    setLocation("");
    setStartMile("");
    setEndMile("");
    setRemark("");
    setEmployeeName("");
    setEditingId(null);
  };

  const handleEdit = (row: MileageRow) => {
    setEditingId(row.id);
    setDate(new Date(row.date));
    setLocation(row.location);
    setStartMile(row.start_mile.toString());
    setEndMile(row.end_mile.toString());
    setRemark(row.remark || "");
    setEmployeeName(row.employee_name || "");
  };

  const handleDelete = async (row: MileageRow) => {
    if (
      !confirm(
        `คุณต้องการลบรายการวันที่ ${format(new Date(row.date), "dd/MM/yyyy")} ใช่ไหม?`,
      )
    ) {
      return;
    }

    const { error } = await supabase.from("mileages").delete().eq("id", row.id);
    if (error) {
      console.error("Error delete mileage:", error);
      alert("ลบรายการไม่สำเร็จ");
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!date) return alert("กรุณาเลือกวันที่");
    if (!location.trim()) return alert("กรุณากรอกสถานที่");
    if (!startMile || !endMile) return alert("กรุณากรอกเลขไมล์ให้ครบ");

    const start = Number(startMile);
    const end = Number(endMile);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return alert("เลขไมล์ต้องเป็นตัวเลข");
    }
    if (end < start) {
      return alert("เลขไมล์สิ้นสุดต้องมากกว่าหรือเท่ากับเลขไมล์เริ่มต้น");
    }

    const distance = end - start;
    const amount = distance * RATE_PER_KM;

    setSaving(true);

    const payload = {
      user_id: user.id,
      date: date.toISOString().slice(0, 10),
      location,
      start_mile: start,
      end_mile: end,
      remark: remark.trim() || null,
      employee_name: employeeName.trim(),
    };

    if (!editingId) {
      // ➕ insert
      const { data, error } = await supabase
        .from("mileages")
        .insert(payload)
        .select()
        .single();
      console.log("PAYLOAD:", payload);

      if (error) {
        console.error("Supabase INSERT ERROR:", JSON.stringify(error, null, 2));

        alert("บันทึกไม่สำเร็จ");
      } else {
        setRows((prev) => [...prev, data as MileageRow]);
        resetForm();
      }
    } else {
      // ✏ update
      const { data, error } = await supabase
        .from("mileages")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();

      if (error) {
        console.error("Error update mileage:", error);
        alert("แก้ไขไม่สำเร็จ");
      } else {
        setRows((prev) =>
          prev.map((r) => (r.id === editingId ? (data as MileageRow) : r)),
        );
        resetForm();
      }
    }

    setSaving(false);
  };

  const totalAmount = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const amt =
          typeof r.amount === "number"
            ? r.amount
            : (r.end_mile - r.start_mile) * RATE_PER_KM;
        return sum + (Number.isFinite(amt) ? amt : 0);
      }, 0),
    [rows],
  );

  if (loadingUser) {
    return (
      <main className="flex flex-col items-center justify-center h-screen text-blue-600">
        <div className="animate-spin h-8 w-8 mb-3 border-4 border-blue-500 border-t-transparent rounded-full" />
        <p className="text-gray-500 animate-pulse">
          กำลังตรวจสอบสิทธิ์ผู้ใช้...
        </p>
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main className="p-6 max-w-6xl mx-auto space-y-6">
        {" "}
        {/* ✅ ขยายความกว้างนิดนึงเผื่อคอลัมน์แอดมิน */}
        {/* หัวข้อ + ปุ่มไปหน้ารายงาน */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              บันทึกเลขไมล์รถยนต์ส่วนตัว
            </h1>
            <p className="text-sm text-slate-500">
              ระบบคำนวณค่า Mileage อัตรา {RATE_PER_KM.toLocaleString()} บาท / 1
              กม.
            </p>
            {isAdmin && (
              <p className="text-xs mt-1 text-amber-600 font-medium">
                👑 โหมดผู้ดูแลระบบ (Admin) – กำลังแสดงข้อมูลของพนักงานทั้งหมด
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับหน้าหลัก
            </Button>
            <Button
              onClick={() => router.push("/private-mile/report")}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <FileText className="w-4 h-4" />
              ออกรายงาน
            </Button>
          </div>
        </div>
        {/* ฟอร์มบันทึกเลขไมล์ (เหมือนเดิม) */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-lg text-slate-800">
              ฟอร์มบันทึกเลขไมล์
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    ชื่อพนักงาน
                  </label>
                  <Input
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="เช่น นายธีรภัทร ทัศนาราม"
                    required
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    วันที่เดินทาง
                  </label>
                  <DatePicker
                    selected={date}
                    onChange={(date: Date | null) => setDate(date)}
                    dateFormat="dd/MM/yyyy"
                    className="border-slate-200 rounded-md p-2 w-full text-sm bg-white"
                    locale={th}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  สถานที่
                </label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="เช่น เยี่ยมลูกค้า – ปราจีนบุรี"
                  className="bg-white"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    เลขไมล์เริ่มต้น
                  </label>
                  <Input
                    type="number"
                    value={startMile}
                    onChange={(e) => setStartMile(e.target.value)}
                    min={0}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    เลขไมล์สิ้นสุด
                  </label>
                  <Input
                    type="number"
                    value={endMile}
                    onChange={(e) => setEndMile(e.target.value)}
                    min={0}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    ระยะทาง (กม.) โดยประมาณ
                  </label>
                  <div className="h-10 flex items-center justify-end px-3 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700">
                    {startMile &&
                    endMile &&
                    !Number.isNaN(Number(endMile) - Number(startMile))
                      ? `${Number(endMile) - Number(startMile)} กม.`
                      : "-"}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  หมายเหตุ / เหตุผลการเดินทาง
                </label>
                <Textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={2}
                  placeholder="เช่น ไปติดตั้งเครื่องจักรที่บริษัทลูกค้า ..."
                  className="bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    ยกเลิกการแก้ไข
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                >
                  {saving
                    ? "กำลังบันทึก..."
                    : editingId
                      ? "บันทึกการแก้ไข"
                      : "บันทึกข้อมูล"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        {/* ตารางรายการ */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50/50 border-b border-slate-100 pb-4 gap-2">
            <CardTitle className="text-lg text-slate-800">
              {isAdmin ? "รายการเลขไมล์ (ทั้งหมด)" : "รายการเลขไมล์ของคุณ"}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <Badge
                variant="secondary"
                className="bg-emerald-100/80 text-emerald-800 border-emerald-200 px-3 py-1 text-sm"
              >
                ยอดรวม: {totalAmount.toLocaleString()} บาท
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingRows ? (
              <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center">
                <div className="animate-spin h-6 w-6 mb-2 border-2 border-blue-500 border-t-transparent rounded-full" />
                กำลังโหลดข้อมูล...
              </div>
            ) : rows.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">
                ยังไม่มีการบันทึกเลขไมล์ในระบบ
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-center font-medium w-12">
                        #
                      </th>

                      {/* ✨ ส่วนหัว: แสดง "เวลาบันทึก" เฉพาะ Admin */}
                      {isAdmin && (
                        <th className="px-4 py-3 font-medium">ชื่อพนักงาน</th>
                      )}
                      <th className="px-4 py-3 font-medium">วันที่</th>
                      <th className="px-4 py-3 font-medium min-w-[150px]">
                        สถานที่
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        ระยะทาง
                      </th>
                      <th className="px-4 py-3 font-medium">เหตุผล</th>
                      <th className="px-4 py-3 text-right font-medium">
                        ยอดเงิน (บาท)
                      </th>
                      <th className="px-4 py-3 text-center font-medium w-24">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r, idx) => {
                      const d = new Date(r.date);
                      const distance =
                        typeof r.distance === "number"
                          ? r.distance
                          : r.end_mile - r.start_mile;
                      const amount =
                        typeof r.amount === "number"
                          ? r.amount
                          : distance * RATE_PER_KM;

                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-center text-slate-400">
                            {idx + 1}
                          </td>

                          {/* ✨ ข้อมูล: แสดง "เวลาบันทึก" เฉพาะ Admin */}
                          {isAdmin && (
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {r.employee_name || "-"}
                            </td>
                          )}
                          <td className="px-4 py-3 text-slate-600">
                            {format(d, "dd/MM/yyyy", { locale: th })}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div
                              className="max-w-[150px] whitespace-normal break-words"
                              title={r.location}
                            >
                              {r.location}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            <div className="flex flex-col items-end">
                              <span className="font-medium text-slate-800">
                                {distance} กม.
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ({r.start_mile.toLocaleString()} -{" "}
                                {r.end_mile.toLocaleString()})
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div
                              className="max-w-[150px] whitespace-normal break-words"
                              title={r.remark || ""}
                            >
                              {r.remark || "-"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                            {amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {/* ✨ Admin ลบ/แก้ได้ทุกคน ส่วน User ธรรมดาแก้ได้แค่ของตัวเอง */}
                            {isAdmin || r.user_id === user.id ? (
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                  onClick={() => handleEdit(r)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleDelete(r)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* แถวยอดรวม */}
                    <tr className="bg-slate-50/80 border-t border-slate-200">
                      <td className="px-4 py-3" />
                      {/* ✨ ปรับ colSpan ให้สัมพันธ์กับคอลัมน์ Admin */}
                      <td
                        className="px-4 py-3 text-right font-semibold text-slate-700"
                        colSpan={isAdmin ? 6 : 5}
                      >
                        ยอดรวมเบิกจ่ายทั้งหมด
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700 text-base">
                        {totalAmount.toLocaleString()} บาท
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

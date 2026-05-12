"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit, Eye, EyeOff, CalendarClock, Sun, Moon } from "lucide-react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const quillRef = useRef<any>(null);

  // 🌙 State สำหรับ Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ✅ เพิ่ม start_date และ end_date ใน State (ตั้งค่าเริ่มต้นเป็นวันนี้ ถึง อีก 7 วันข้างหน้า)
  const [form, setForm] = useState({
    id: "",
    title: "",
    content: "",
    is_active: true,
    start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
  });

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

  const loadAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setAnnouncements(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("announcements").upload(filePath, file);

      if (uploadError) {
        alert("อัปโหลดรูปภาพไม่สำเร็จ: " + uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("announcements").getPublicUrl(filePath);
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection(true);
      quill.insertEmbed(range.index, "image", publicUrl);
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image"],
        ["clean"],
      ],
      handlers: { image: imageHandler },
    },
  }), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return alert("กรุณากรอกหัวข้อและเนื้อหา");
    if (!form.start_date || !form.end_date) return alert("กรุณากำหนดเวลาเริ่มและสิ้นสุด");
    if (new Date(form.start_date) >= new Date(form.end_date)) return alert("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");

    // ✅ เตรียมข้อมูลสำหรับส่งไปฐานข้อมูล แปลงกลับเป็น ISO String
    const payload = {
      title: form.title,
      content: form.content,
      is_active: form.is_active,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
    };

    if (form.id) {
      const { error } = await supabase.from("announcements").update(payload).eq("id", form.id);
      if (error) alert("อัปเดตไม่สำเร็จ: " + error.message);
    } else {
      const { error } = await supabase.from("announcements").insert(payload);
      if (error) alert("สร้างประกาศไม่สำเร็จ: " + error.message);
    }
    
    setForm({ 
      id: "", title: "", content: "", is_active: true, 
      start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"), 
      end_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm") 
    });
    setIsEditing(false);
    loadAnnouncements();
  };

  const handleEdit = (item: any) => {
    setForm({
      id: item.id,
      title: item.title,
      content: item.content,
      is_active: item.is_active,
      start_date: item.start_date ? format(new Date(item.start_date), "yyyy-MM-dd'T'HH:mm") : "",
      end_date: item.end_date ? format(new Date(item.end_date), "yyyy-MM-dd'T'HH:mm") : "",
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบประกาศนี้?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    loadAnnouncements();
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    await supabase.from("announcements").update({ is_active: !currentStatus }).eq("id", id);
    loadAnnouncements();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 transition-colors duration-300">
      <Navbar />

      {/* ✨ CSS พิเศษสำหรับปรับสี ReactQuill ใน Dark Mode */}
      <style dangerouslySetInnerHTML={{__html: `
        .dark .ql-toolbar.ql-snow {
          background-color: #1e293b;
          border-color: #334155;
        }
        .dark .ql-container.ql-snow {
          border-color: #334155;
          background-color: #0f172a;
        }
        .dark .ql-editor {
          color: #f8fafc;
        }
        .dark .ql-snow .ql-stroke {
          stroke: #94a3b8;
        }
        .dark .ql-snow .ql-fill, .dark .ql-snow .ql-stroke.ql-fill {
          fill: #94a3b8;
        }
        .dark .ql-snow .ql-picker {
          color: #94a3b8;
        }
        .dark .ql-snow .ql-picker-options {
          background-color: #1e293b;
          border-color: #334155;
        }
      `}} />

      <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 mt-4">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4 transition-colors">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">จัดการประกาศ (Announcements)</h1>
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

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <h2 className="text-lg font-semibold mb-4 text-blue-700 dark:text-blue-400">
            {isEditing ? "✏️ แก้ไขประกาศ" : "📢 สร้างประกาศใหม่"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">หัวข้อประกาศ</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="เช่น แจ้งหยุดสงกรานต์"
                required
                className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
              />
            </div>
            
            {/* ✅ ส่วนกำหนดวันที่แสดงผล */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 rounded-xl transition-colors">
              <div>
                <label className="block text-sm font-medium text-blue-800 dark:text-blue-400 mb-1 flex items-center gap-1">
                  <CalendarClock className="w-4 h-4"/> เริ่มแสดงผล
                </label>
                <Input
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                  className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 dark:text-white dark:[color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 dark:text-blue-400 mb-1 flex items-center gap-1">
                  <CalendarClock className="w-4 h-4"/> สิ้นสุดการแสดงผล
                </label>
                <Input
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  required
                  className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 dark:text-white dark:[color-scheme:dark]"
                />
              </div>
            </div>
            
            <div className="pb-12">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">เนื้อหาประกาศ (ฝั่ง User จะเห็นตามนี้เป๊ะๆ)</label>
              <div className="h-64">
                <ReactQuill 
                  theme="snow" 
                  value={form.content} 
                  onChange={(val) => setForm({ ...form, content: val })}
                  modules={modules}
                  className="h-full rounded-md"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="isActive"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                เปิดสวิตช์หลัก (หากปิด ประกาศจะไม่แสดงแม้จะอยู่ในช่วงเวลาก็ตาม)
              </label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm">
                {isEditing ? "💾 บันทึกการแก้ไข" : "🚀 บันทึกและตั้งเวลา"}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700" onClick={() => { 
                  setForm({ id: "", title: "", content: "", is_active: true, start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"), end_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm") }); 
                  setIsEditing(false); 
                }}>
                  ยกเลิก
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* ตารางแสดงประกาศ */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b dark:border-slate-700 whitespace-nowrap">
                <tr>
                  <th className="p-4 font-medium">หัวข้อ</th>
                  <th className="p-4 font-medium">ช่วงเวลาแสดงผล</th>
                  <th className="p-4 font-medium text-center">สวิตช์หลัก</th>
                  <th className="p-4 font-medium text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">กำลังโหลดข้อมูล...</td></tr>
                ) : announcements.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">ยังไม่มีประกาศในระบบ</td></tr>
                ) : (
                  announcements.map((item) => {
                    const now = new Date();
                    const start = new Date(item.start_date);
                    const end = new Date(item.end_date);
                    // เช็คว่าเวลาปัจจุบันอยู่ในช่วงเวลาหรือไม่
                    const isTimeActive = now >= start && now <= end;
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{item.title}</td>
                        <td className="p-4">
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            เริ่ม: {format(start, "dd MMM yy HH:mm", { locale: th })}<br/>
                            จบ: {format(end, "dd MMM yy HH:mm", { locale: th })}
                          </div>
                          {item.is_active && (
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium border ${isTimeActive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 dark:border-emerald-800/50' : now > end ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 dark:border-slate-700' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 dark:border-amber-800/50'}`}>
                              {isTimeActive ? "กำลังแสดงผล" : now > end ? "หมดเวลา" : "รอเวลาแสดง"}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => toggleActive(item.id, item.is_active)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 mx-auto transition-colors ${item.is_active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
                          >
                            {item.is_active ? <><Eye className="w-3 h-3"/> เปิด</> : <><EyeOff className="w-3 h-3"/> ปิด</>}
                          </button>
                        </td>
                        <td className="p-4 text-right space-x-2 whitespace-nowrap">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(item)} className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
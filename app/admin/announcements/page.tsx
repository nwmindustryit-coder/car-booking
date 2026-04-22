"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit, Eye, EyeOff, CalendarClock } from "lucide-react";
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

  // ✅ เพิ่ม start_date และ end_date ใน State (ตั้งค่าเริ่มต้นเป็นวันนี้ ถึง อีก 7 วันข้างหน้า)
  const [form, setForm] = useState({
    id: "",
    title: "",
    content: "",
    is_active: true,
    start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
  });

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
    <div className="min-h-screen bg-slate-50 pb-12">
      <Navbar />
      <main className="p-6 max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">จัดการประกาศ (Announcements)</h1>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 text-blue-700">
            {isEditing ? "✏️ แก้ไขประกาศ" : "📢 สร้างประกาศใหม่"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">หัวข้อประกาศ</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="เช่น แจ้งหยุดสงกรานต์"
                required
              />
            </div>
            
            {/* ✅ ส่วนกำหนดวันที่แสดงผล */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1 flex items-center gap-1">
                  <CalendarClock className="w-4 h-4"/> เริ่มแสดงผล
                </label>
                <Input
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1 flex items-center gap-1">
                  <CalendarClock className="w-4 h-4"/> สิ้นสุดการแสดงผล
                </label>
                <Input
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  required
                  className="bg-white"
                />
              </div>
            </div>
            
            <div className="pb-12">
              <label className="block text-sm font-medium text-slate-600 mb-1">เนื้อหาประกาศ (ฝั่ง User จะเห็นตามนี้เป๊ะๆ)</label>
              <div className="h-64">
                <ReactQuill 
                  ref={quillRef} 
                  theme="snow" 
                  value={form.content} 
                  onChange={(val) => setForm({ ...form, content: val })}
                  modules={modules}
                  className="h-full bg-white rounded-md"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="isActive"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
                เปิดสวิตช์หลัก (หากปิด ประกาศจะไม่แสดงแม้จะอยู่ในช่วงเวลาก็ตาม)
              </label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {isEditing ? "💾 บันทึกการแก้ไข" : "🚀 บันทึกและตั้งเวลา"}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={() => { 
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b whitespace-nowrap">
                <tr>
                  <th className="p-4 font-medium">หัวข้อ</th>
                  <th className="p-4 font-medium">ช่วงเวลาแสดงผล</th>
                  <th className="p-4 font-medium text-center">สวิตช์หลัก</th>
                  <th className="p-4 font-medium text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
                ) : announcements.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">ยังไม่มีประกาศในระบบ</td></tr>
                ) : (
                  announcements.map((item) => {
                    const now = new Date();
                    const start = new Date(item.start_date);
                    const end = new Date(item.end_date);
                    // เช็คว่าเวลาปัจจุบันอยู่ในช่วงเวลาหรือไม่
                    const isTimeActive = now >= start && now <= end;
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-4 font-medium text-slate-800">{item.title}</td>
                        <td className="p-4">
                          <div className="text-xs text-slate-600">
                            เริ่ม: {format(start, "dd MMM yy HH:mm", { locale: th })}<br/>
                            จบ: {format(end, "dd MMM yy HH:mm", { locale: th })}
                          </div>
                          {item.is_active && (
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${isTimeActive ? 'bg-emerald-100 text-emerald-700' : now > end ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>
                              {isTimeActive ? "กำลังแสดงผล" : now > end ? "หมดเวลา" : "รอเวลาแสดง"}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => toggleActive(item.id, item.is_active)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 mx-auto transition-colors ${item.is_active ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                          >
                            {item.is_active ? <><Eye className="w-3 h-3"/> เปิด</> : <><EyeOff className="w-3 h-3"/> ปิด</>}
                          </button>
                        </td>
                        <td className="p-4 text-right space-x-2 whitespace-nowrap">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(item)} className="text-amber-600 hover:bg-amber-50">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)} className="text-red-600 hover:bg-red-50">
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
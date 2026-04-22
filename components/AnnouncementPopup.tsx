"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AnnouncementPopup() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hideToday, setHideToday] = useState(false);

  useEffect(() => {
    const checkAnnouncement = async () => {
      // 1. ตรวจสอบว่าวันนี้ผู้ใช้เคยกด "ปิดวันนี้" ไปแล้วหรือยัง?
      const hiddenDate = localStorage.getItem("hideAnnouncementDate");
      const today = new Date().toLocaleDateString("sv-SE"); // format YYYY-MM-DD
      
      if (hiddenDate === today) return; // ถ้าเคยซ่อนของวันนี้แล้ว ก็จบการทำงานไปเลย

      // 2. ถ้ายังไม่เคยซ่อน ไปดึงประกาศที่เปิด Active อยู่มาแสดง
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setAnnouncements(data);
        setIsOpen(true); // สั่งเปิด Popup
      }
    };

    checkAnnouncement();
  }, []);

  const handleClose = () => {
    if (hideToday) {
      const today = new Date().toLocaleDateString("sv-SE");
      localStorage.setItem("hideAnnouncementDate", today);
    }
    setIsOpen(false);
  };

  if (!isOpen || announcements.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div 
        className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300"
      >
        {/* หัว Popup */}
        <div className="bg-blue-600 p-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            📢 ประกาศแจ้งเตือน
          </h2>
          <button onClick={handleClose} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors">
            ✕
          </button>
        </div>

        {/* เนื้อหาประกาศ (รองรับหลายประกาศพร้อมกัน) */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {announcements.map((ann, idx) => (
            <div key={ann.id} className={idx > 0 ? "pt-8 border-t border-slate-200" : ""}>
              {/* ✅ ส่วนนี้จะแปลง HTML จาก ReactQuill มาเป็นหน้าตาจริงๆ */}
              <div 
                className="prose prose-blue max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: ann.content }} 
              />
            </div>
          ))}
        </div>

        {/* ท้าย Popup และปุ่มปิด */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input 
              type="checkbox" 
              checked={hideToday}
              onChange={(e) => setHideToday(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            ไม่ต้องแสดงอีกในวันนี้
          </label>
          <button 
            onClick={handleClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl transition-colors"
          >
            รับทราบ และปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
import { supabase } from "./supabaseClient";

export interface Holiday {
  id?: string;
  date: string; // YYYY-MM-DD
  name: string;
}

// ฟังก์ชันสำหรับดึงข้อมูลวันหยุดจาก Database แบบ Real-time
export async function getHolidaysFromDB(): Promise<Holiday[]> {
  try {
    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .order("date", { ascending: true });
    
    if (error) {
      // ถ้า Error เพราะยังไม่มี Table (code 42P01 ใน Postgres) จะไม่แสดง Error ใหญ่โต
      if (error.code === '42P01') {
        console.warn("Table 'holidays' does not exist yet. Please create it in Supabase.");
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (err) {
    // ซ่อน Error ว่างๆ และแสดงเฉพาะข้อมูลที่จำเป็น
    return [];
  }
}

// ฟังก์ชัน Helper สำหรับตรวจสอบว่าเป็นวันหยุดหรือไม่ (ใช้ใน Client Component)
export function checkIsHoliday(date: Date, holidayList: Holiday[]): Holiday | undefined {
  if (!date) return undefined;
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  
  return holidayList.find((h) => h.date === dateString);
}


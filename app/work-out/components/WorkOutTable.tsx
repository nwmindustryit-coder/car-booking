import { Workout } from "@/types/workout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { MapPin, Moon, ChevronRight, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface WorkOutTableProps {
  rows: Workout[];
  viewMode: 'user' | 'admin';
  isAdmin: boolean;
  currentUserId?: string;
  onEdit: (row: Workout) => void;
  onDelete: (id: string) => void;
}

export function WorkOutTable({ rows, viewMode, isAdmin, currentUserId, onEdit, onDelete }: WorkOutTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="px-4 py-3 text-center w-12">#</th>
            {viewMode === 'admin' && <th className="px-4 py-3">พนักงาน</th>}
            <th className="px-4 py-3">วันที่</th>
            <th className="px-4 py-3">สถานที่</th>
            <th className="px-4 py-3 text-center">เวลาปฏิบัติงาน</th>
            <th className="px-4 py-3 text-center">ค้างคืน</th>
            <th className="px-4 py-3 text-right">รวมเวลา</th>
            <th className="px-4 py-3 text-right">เบี้ยเลี้ยง</th>
            <th className="px-4 py-3 text-center w-24">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {rows.map((r, idx) => {
            const d = new Date(r.date);
            return (
              <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors group">
                <td className="px-4 py-3 text-center text-slate-400 dark:text-slate-500">{idx + 1}</td>
                
                {viewMode === 'admin' && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {r.employee_name?.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{r.employee_name}</span>
                    </div>
                  </td>
                )}

                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {format(d, "dd MMM yy", { locale: th })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-slate-700 dark:text-slate-200 font-medium">{r.location}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" /> พิกัดปฏิบัติงาน
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono">
                    {r.start_time} <ChevronRight className="w-3 h-3 opacity-30" /> {r.end_time}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {r.stay_over ? (
                    <Badge className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100">
                      <Moon className="w-3 h-3 mr-1" /> ค้างคืน
                    </Badge>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-700">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-blue-600 dark:text-blue-400">{r.hours}</span>
                  <span className="ml-1 text-[10px] text-slate-400">ชม.</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{r.amount.toLocaleString()}</span>
                  <span className="ml-1 text-[10px] text-slate-400">฿</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {isAdmin || r.user_id === currentUserId ? (
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30" onClick={() => onEdit(r)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ยืนยันการลบข้อมูล</AlertDialogTitle>
                            <AlertDialogDescription>
                              คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลการปฏิบัติงานนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(r.id)} className="bg-red-600 hover:bg-red-700">ลบข้อมูล</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300 dark:text-slate-700">ไม่มีสิทธิ์</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

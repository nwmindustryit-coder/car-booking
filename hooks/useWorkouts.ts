import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Workout, Profile } from "@/types/workout";
import { useRouter } from "next/navigation";

export function useWorkouts(viewMode: 'user' | 'admin') {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadData = async (userId: string, currentViewMode: 'user' | 'admin') => {
    let query = supabase
      .from("workouts")
      .select("*")
      .order("date", { ascending: false });

    if (currentViewMode === 'user') {
      query = query.eq("user_id", userId);
    }

    const { data } = await query;
    setRows(data ?? []);
  };

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.push("/login");

      setUser(userData.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, department, role")
        .eq("id", userData.user.id)
        .single();

      setProfile(profileData);
      await loadData(userData.user.id, viewMode);
      setLoading(false);
    };
    load();
  }, [router, viewMode]);

  const remove = async (id: string) => {
    if (!confirm("ต้องการลบข้อมูลนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้"))
      return false;
    
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (!error) {
      setRows(prev => prev.filter((r) => r.id !== id));
      return true;
    }
    return false;
  };

  const refresh = () => {
    if (user) loadData(user.id, viewMode);
  };

  return {
    user,
    profile,
    rows,
    loading,
    remove,
    refresh
  };
}

export const calculateWorkoutStats = (startTime: string, endTime: string, stayOver: boolean) => {
  if (!startTime || !endTime) return { hours: 0, amount: 0 };
  
  const s = new Date(`2000-01-01T${startTime}`);
  const e = new Date(`2000-01-01T${endTime}`);
  if (e < s) e.setDate(e.getDate() + 1);
  
  const diffMs = e.getTime() - s.getTime();
  const diff = diffMs / 1000 / 3600;
  const hours = Math.round(diff * 100) / 100;

  let amount = 0;
  if (stayOver) amount = 200;
  else if (hours > 8) amount = 100;
  else if (hours > 0) amount = 60;

  return { hours, amount };
};

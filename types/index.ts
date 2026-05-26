export interface Car {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
  status?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
  department: string;
}

export interface Workout {
  id: string;
  user_id: string;
  employee_name: string;
  date: string;
  location: string;
  start_time: string;
  end_time: string;
  hours: number;
  stay_over: boolean;
  amount: number;
  created_at?: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  department?: string;
  role: 'user' | 'admin';
  email?: string;
}

export interface Booking {
  id: string;
  date: string;
  time_slot: string;
  user_id: string;
  car_id: string;
  status?: string;
  created_at?: string;
  purpose?: string;
  driver_name: string;
  destination: string;
  reason: string;
  user_name?: string;
  cars?: { plate: string } | { plate: string }[];
  miles?: Mile | Mile[];
  miles_status?: 'recorded' | 'missing';
  total_mile?: number | null;
}

export interface Mile {
  id: string;
  booking_id: string;
  start_mile: number;
  end_mile: number;
  total_mile: number;
  image_start?: string;
  image_end?: string;
  created_at?: string;
}

export interface DashboardRow {
  id: string;
  plate: string;
  date: string;
  department: string;
  time_slot: string;
  km: number;
  mins: number;
}

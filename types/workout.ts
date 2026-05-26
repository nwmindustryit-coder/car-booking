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
  role: 'user' | 'admin';
  department: string;
}

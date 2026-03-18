export interface Adventure {
  id: number;
  troop_id: number;
  name: string;
  adventure_type: string;
  depart_date: string | null;
  arrive_date: string | null;
  return_date: string | null;
  home_date: string | null;
  trek_date?: string | null;
  itinerary_id: string | null;
  attendance_milestones: string | null;
  created_at: string;
}

export interface Crew {
  id: number;
  adventure_id: number;
  name: string;
  crew_num: number | null;
  itinerary_id: string | null;
  depart_date: string | null;
  arrive_date: string | null;
  return_date: string | null;
  home_date: string | null;
  created_at: string;
}

export interface AdventureMember {
  id: number;
  user_id: number | null;
  adventure_id: number;
  crew_id: number | null;
  name: string;
  email?: string;
  is_manual: boolean;
  participation: "trekking" | "support";
  role: "admin" | "member";
  user_type: "adult" | "scout" | null;
  skills: number[];
  medical: number[];
  admin_tasks: number[];
  dates: string[];
  linked_to: number | null;
  linked_scouts: number[];
  crew_name?: string;
  created_at?: string;
}

export interface TrekDates {
  depart: Date | null;
  arrive: Date | null;
  return: Date | null;
  home: Date | null;
  trek: Date | null;
}

export interface DateLabels {
  depart: string;
  arrive: string;
  return: string;
  home: string;
}

export interface AdventureType {
  id: string;
  name: string;
  location: string;
  icon: string;
  enabled: boolean;
  dateLabels: DateLabels;
}

export interface Invitation {
  id: number;
  adventure_id: number;
  troop_id: number;
  email: string;
  token: string;
  status: "pending" | "accepted" | "expired";
  created_at: string;
}

export interface LinkRequest {
  id: number;
  adventure_id: number;
  requester_id: number;
  scout_id: number;
  status: "pending" | "approved" | "denied";
  requester_name?: string;
  scout_name?: string;
  created_at: string;
}

export interface Itinerary {
  id: string;
  name: string;
  days: number;
  miles: number;
  rating: string;
  stops?: unknown[];
}

export interface AdventureDocument {
  id: number;
  adventure_id: number;
  filename: string;
  original_name: string;
  description: string | null;
  mime_type: string;
  size: number;
  uploaded_by: number;
  uploader_name?: string;
  created_at: string;
}

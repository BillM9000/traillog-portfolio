export type SkillCategory = "training" | "medical" | "admin";

export interface Skill {
  id: number;
  adventure_id: number;
  name: string;
  description: string;
  category: SkillCategory;
  icon: string | null;
  is_system: number;
  created_at: string;
}

export interface TrainingEvent {
  id: number;
  adventure_id: number;
  date: string;
  period: "am" | "pm" | "all";
  time_label: string | null;
  location: string | null;
  notes: string | null;
  type: "proposed" | "scheduled";
  status: "active" | "completed" | "cancelled";
  created_by: number;
  creator_name?: string;
  rsvps?: TrainingRSVP[];
  attendance?: TrainingAttendance[];
  created_at: string;
}

export interface TrainingRSVP {
  event_id: number;
  user_id: number;
  status: "going" | "cant";
  user_name?: string;
}

export interface TrainingAttendance {
  event_id: number;
  user_id: number;
  attended: number;
  marked_by: number | null;
  marked_at: string | null;
}

export interface Badge {
  id: number;
  user_id: number;
  adventure_id: number;
  badge_id: string;
  earned_at: string;
}

export interface Milestone {
  id: number;
  crew_id: number;
  milestone_key: string;
  pct: number;
  achieved_at: string;
}

export interface Achievement {
  badges: Badge[];
  milestones: Milestone[];
}

export interface ReadinessScore {
  training: number;
  gear: number;
  medical: number;
  admin: number;
  overall: number;
}

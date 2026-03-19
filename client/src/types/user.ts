export interface User {
  id: number;
  name: string;
  email: string;
  user_type: "adult" | "scout" | null;
  age_confirmed: "13+" | "18+" | null;
  is_admin: boolean;
  auth_provider: "google" | "email";
  has_password: boolean;
  parent_email: string | null;
  parent_email_2: string | null;
  tos_accepted_at: string | null;
  avatar_url?: string;
  is_global_admin?: boolean;
  email_verified: number;
  created_at: string;
  onboarding_role?: string | null;
  onboarding_completed?: number;
  onboarding_steps?: string | null;
}

export interface Membership {
  troop_id: number;
  user_id: number;
  role: "admin" | "member";
  status: "pending" | "approved" | "denied";
  participation: "trekking" | "support" | null;
  requested_adventures: string | null;
  troop_name?: string;
  troop_council?: string;
  troop_location?: string;
  council?: string;
  location?: string;
  is_public?: number;
  logo?: string;
}

export interface AdventureMembership {
  adventure_id: number;
  user_id: number;
  role: "admin" | "member";
  participation: "trekking" | "support";
  adventure_name?: string;
  adventure_type?: string;
}

export interface MeResponse {
  user: User;
  memberships: Membership[];
  adventureMemberships: AdventureMembership[];
}

export interface Council {
  id: number;
  name: string;
  council_num: string;
  city: string;
  state: string;
}

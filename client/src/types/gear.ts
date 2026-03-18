export type SharingType = "personal" | "crew" | "buddy" | "provided";
export type GearStatus = "need" | "owned" | "packed" | "needed";

export interface GearCatalogItem {
  id: number;
  name: string;
  category: string;
  weight_lbs: number | null;
  sharing_type: SharingType;
  sort_order: number;
  brand: string | null;
  product_name: string | null;
  model_number: string | null;
  description: string | null;
  priority?: string;
  weight_oz?: number | string | null;
  created_at: string;
}

export interface MemberGearItem {
  id: number;
  user_id: number;
  adventure_id: number;
  crew_id: number | null;
  gear_catalog_id: number;
  status: GearStatus;
  weight_override: number | null;
  notes: string | null;
  name?: string;
  category?: string;
  sharing_type?: SharingType;
  weight_lbs?: number | null;
}

export interface PackWeightResult {
  item_count: number;
  grand_total_lbs: number;
  philmont_limit_lbs: number;
  over_limit: boolean;
  base_weight: number;
  base_weight_lbs: number;
  food_weight: number;
  food_estimate_lbs: number;
  water_weight: number;
  water_lbs: number;
  total_weight: number;
  trek_days: number;
  crew_buddy_count: number;
  provided_count: number;
  by_category: Record<string, { count: number; weight_oz: number }>;
}

export interface GearOverride {
  gear_catalog_id: number;
  troop_id: number;
  hidden: boolean;
}

export interface TroopCustomGear {
  id: number;
  troop_id: number;
  name: string;
  category: string;
  weight_lbs: number | null;
  sharing_type: SharingType;
  description: string | null;
}

export interface ProductOption {
  id: number;
  gear_catalog_id: number;
  name: string;
  brand: string | null;
  url: string | null;
  price: number | null;
  weight_lbs: number | null;
  notes: string | null;
}

export interface AIGearRecommendation {
  id: number;
  gear_catalog_id: number;
  recommendation: string;
  created_at: string;
}

export type CatSex = "male" | "female" | "unknown";
export type CatRole = "kitten" | "parent";

export interface Kitten {
  id: string;
  name: string;
  color: string;
  birth_date: string | null; // YYYY-MM-DD
  notes: string | null;
  archived: boolean;
  sex: CatSex;
  neutered: boolean;
  role: CatRole;
  created_at: string;
}

export type CareType = "vaccination" | "flea_worm" | "dental" | "vet_visit" | "medication" | "grooming" | "other";

export interface HealthRecord {
  id: string;
  cat_id: string;
  type: CareType;
  title: string;
  happened_on: string; // YYYY-MM-DD
  notes: string | null;
  created_at: string;
}

export interface CareSchedule {
  id: string;
  cat_id: string;
  type: CareType;
  title: string;
  interval_days: number | null; // null = one-off
  next_due: string; // YYYY-MM-DD
  notes: string | null;
  created_at: string;
}

export interface PushDevice {
  endpoint: string;
  label: string | null;
  created_at: string;
}

export interface WeighIn {
  id: string;
  kitten_id: string;
  weight_grams: number;
  weighed_at: string; // ISO timestamp
  logged_by: string | null;
  photo_url: string | null;
  video_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface HouseholdSettings {
  min_daily_gain: number; // grams/day below which a kitten is flagged
}

export interface WeighInInput {
  kitten_id: string;
  weight_grams: number;
  weighed_at: string;
  logged_by: string | null;
  photo_url: string | null;
  video_url: string | null;
  notes: string | null;
}

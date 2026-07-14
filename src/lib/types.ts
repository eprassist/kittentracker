export interface Kitten {
  id: string;
  name: string;
  color: string;
  birth_date: string | null; // YYYY-MM-DD
  notes: string | null;
  archived: boolean;
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

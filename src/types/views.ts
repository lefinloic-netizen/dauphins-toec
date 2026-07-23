import type { Sex, TagType, TagSource, ExerciseCategory, TimeSlot } from "./database";

export interface AthleteWithProfile {
  id: string;
  sex: Sex | null;
  birth_date: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  category: string | null;
  profile: { first_name: string; last_name: string; email: string };
  athlete_groups: { group: { id: string; name: string; color: string } }[];
}

export interface AthleteTagRow {
  id: string;
  athlete_id: string;
  type: TagType;
  label: string;
  source: TagSource;
}

export interface RecordRow {
  exercise_id: string;
  record_kg: number;
  exercise: { name: string; category: ExerciseCategory; is_record: boolean };
}

export interface PerformancePoint {
  id: string;
  value_kg: number;
  date: string;
}

export interface SessionWithGroup {
  id: string;
  name: string;
  date: string | null;
  duration_minutes: number | null;
  time_slot: TimeSlot | null;
  is_template: boolean;
  group: { id: string; name: string; color: string } | null;
}

export type Role = "coach" | "athlete";
export type Sex = "M" | "F";
export type TagType = "fort" | "faible" | "a_travailler";
export type TagSource = "questionnaire" | "coach";
export type ExerciseCategory = "musculation" | "mobilite" | "filler" | "renfo" | "cardio" | "natation" | "saut";

export type Profile = {
  id: string;
  role: Role;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
};

export type Athlete = {
  id: string;
  sex: Sex | null;
  birth_date: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  category: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  profession: string | null;
  work_activity_level: number | null;
  created_at: string;
  updated_at: string;
};

export type AthleteTag = {
  id: string;
  athlete_id: string;
  type: TagType;
  label: string;
  source: TagSource;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

export type AthleteGroup = {
  athlete_id: string;
  group_id: string;
};

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  is_record: boolean;
  created_at: string;
};

export type Performance = {
  id: string;
  athlete_id: string;
  exercise_id: string;
  value_kg: number;
  date: string;
  session_id: string | null;
  set_number: number | null;
  reps: number | null;
  created_at: string;
};

export type TimeSlot = "matin" | "apres_midi" | "soir";

export type SessionRow = {
  id: string;
  name: string;
  date: string | null;
  group_id: string | null;
  duration_minutes: number | null;
  warmup_text: string | null;
  time_slot: TimeSlot | null;
  is_template: boolean;
  created_at: string;
};

export type SessionBlock = {
  id: string;
  session_id: string;
  title: string;
  order_index: number;
};

export type SessionExercise = {
  id: string;
  block_id: string;
  exercise_name: string;
  exercise_id: string | null;
  sets: string | null;
  reps: string | null;
  charge_rpe: string | null;
  recovery: string | null;
  order_index: number;
};

export type NextCompetition = {
  id: string;
  name: string;
  date: string;
  is_active: boolean;
  created_at: string;
};

export type SessionAthleteNote = {
  id: string;
  session_id: string;
  athlete_id: string;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionnaireResponses = {
  id: string;
  athlete_id: string;
  general: Record<string, unknown>;
  sport: Record<string, unknown>;
  medical: Record<string, unknown>;
  measurements: Record<string, unknown>;
  nutrition: Record<string, unknown>;
  other_remarks: string | null;
  submitted_at: string;
};

// Minimal Database shape so @supabase/supabase-js can type `.from(...)` calls.
// Not exhaustive (Insert/Update loosely typed as Partial) — good enough for a small app.
// Uses `type` (not `interface`) throughout: interfaces don't get an implicit index
// signature in TS, which breaks assignability to supabase-js's `Record<string, unknown>` Row constraint.
type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      athletes: TableDef<Athlete>;
      athlete_tags: TableDef<AthleteTag>;
      groups: TableDef<Group>;
      athlete_groups: TableDef<AthleteGroup>;
      exercises: TableDef<Exercise>;
      performances: TableDef<Performance>;
      sessions: TableDef<SessionRow>;
      session_blocks: TableDef<SessionBlock>;
      session_exercises: TableDef<SessionExercise>;
      next_competition: TableDef<NextCompetition>;
      questionnaire_responses: TableDef<QuestionnaireResponses>;
      session_athlete_notes: TableDef<SessionAthleteNote>;
    };
    Views: {
      athlete_records: {
        Row: { athlete_id: string; exercise_id: string; record_kg: number };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
};

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { toISODate } from "../../lib/dates";
import Modal from "../Modal";

interface SessionExerciseView {
  id: string;
  exercise_name: string;
  exercise_id: string | null;
  sets: string | null;
  reps: string | null;
  charge_rpe: string | null;
  recovery: string | null;
}

interface SessionBlockView {
  id: string;
  title: string;
  exercises: SessionExerciseView[];
}

interface SetRow {
  reps: string;
  weight: string;
}

function parseSetsCount(text: string | null): number {
  const n = parseInt(text ?? "", 10);
  if (isNaN(n) || n < 1) return 1;
  return Math.min(n, 10);
}

function defaultReps(text: string | null): string {
  const trimmed = (text ?? "").trim();
  return /^\d+$/.test(trimmed) ? trimmed : "";
}

export default function LogSessionModal({
  athleteId,
  sessionId,
  sessionDate,
  sessionName,
  blocks,
  onClose,
  onSaved,
}: {
  athleteId: string;
  sessionId: string;
  sessionDate: string | null;
  sessionName: string;
  blocks: SessionBlockView[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [setsByExercise, setSetsByExercise] = useState<Record<string, SetRow[]>>({});
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setLoading(true);

      const { data: noteData } = await supabase
        .from("session_athlete_notes")
        .select("comment")
        .eq("session_id", sessionId)
        .eq("athlete_id", athleteId)
        .maybeSingle();
      setComment(noteData?.comment ?? "");

      const { data: perfData } = await supabase
        .from("performances")
        .select("exercise_id, value_kg, reps, set_number")
        .eq("session_id", sessionId)
        .eq("athlete_id", athleteId)
        .order("set_number");

      const byExercise: Record<string, SetRow[]> = {};
      for (const p of perfData ?? []) {
        if (!p.exercise_id) continue;
        (byExercise[p.exercise_id] ??= []).push({
          reps: p.reps?.toString() ?? "",
          weight: p.value_kg.toString(),
        });
      }

      const initial: Record<string, SetRow[]> = {};
      for (const block of blocks) {
        for (const ex of block.exercises) {
          if (ex.exercise_id && byExercise[ex.exercise_id]) {
            initial[ex.id] = byExercise[ex.exercise_id];
          } else {
            const count = parseSetsCount(ex.sets);
            initial[ex.id] = Array.from({ length: count }, () => ({ reps: defaultReps(ex.reps), weight: "" }));
          }
        }
      }
      setSetsByExercise(initial);
      setLoading(false);
    }
    init();
  }, [sessionId, athleteId, blocks]);

  function updateSet(exId: string, index: number, patch: Partial<SetRow>) {
    setSetsByExercise((prev) => ({
      ...prev,
      [exId]: prev[exId].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function addSet(exId: string) {
    setSetsByExercise((prev) => ({ ...prev, [exId]: [...(prev[exId] ?? []), { reps: "", weight: "" }] }));
  }

  function removeSet(exId: string, index: number) {
    setSetsByExercise((prev) => ({ ...prev, [exId]: prev[exId].filter((_, i) => i !== index) }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    await supabase.from("performances").delete().eq("athlete_id", athleteId).eq("session_id", sessionId);

    for (const block of blocks) {
      for (const ex of block.exercises) {
        const rows = (setsByExercise[ex.id] ?? []).filter((r) => r.weight.trim() !== "");
        if (rows.length === 0) continue;

        let exerciseId = ex.exercise_id;
        if (!exerciseId) {
          const { data: found } = await supabase
            .from("exercises")
            .select("id")
            .ilike("name", ex.exercise_name)
            .maybeSingle();
          if (found) {
            exerciseId = found.id;
          } else {
            const { data: created } = await supabase
              .from("exercises")
              .insert({ name: ex.exercise_name, category: "musculation" })
              .select("id")
              .single();
            exerciseId = created?.id ?? null;
          }
        }
        if (!exerciseId) continue;

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          await supabase.from("performances").insert({
            athlete_id: athleteId,
            exercise_id: exerciseId,
            value_kg: Number(r.weight),
            date: sessionDate ?? toISODate(new Date()),
            session_id: sessionId,
            set_number: i + 1,
            reps: r.reps ? Number(r.reps) : null,
          });
        }
      }
    }

    const { error: noteError } = await supabase
      .from("session_athlete_notes")
      .upsert({ session_id: sessionId, athlete_id: athleteId, comment: comment || null }, { onConflict: "session_id,athlete_id" });

    setSaving(false);

    if (noteError) {
      setError(noteError.message);
      return;
    }

    onSaved();
  }

  const hasExercises = blocks.some((b) => b.exercises.length > 0);

  return (
    <Modal title={`Mes perfs — ${sessionName}`} onClose={onClose}>
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
        {loading && <p className="text-sm text-gray-400">Chargement...</p>}

        {!loading && !hasExercises && (
          <p className="text-sm text-gray-400">Aucun exercice de musculation renseigné pour cette séance.</p>
        )}

        {!loading &&
          blocks.map((block) =>
            block.exercises.map((ex) => (
              <div key={ex.id} className="border border-gray-200 rounded-xl p-3">
                <div className="font-medium text-sm text-gray-800 mb-2">{ex.exercise_name}</div>
                <div className="flex flex-col gap-1.5">
                  {(setsByExercise[ex.id] ?? []).map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-12 shrink-0">Série {i + 1}</span>
                      <input
                        type="number"
                        placeholder="reps"
                        value={row.reps}
                        onChange={(e) => updateSet(ex.id, i, { reps: e.target.value })}
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
                      />
                      <input
                        type="number"
                        step="0.5"
                        placeholder="kg"
                        value={row.weight}
                        onChange={(e) => updateSet(ex.id, i, { weight: e.target.value })}
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
                      />
                      <button onClick={() => removeSet(ex.id, i)} className="text-gray-300 hover:text-red-600 text-sm">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={() => addSet(ex.id)} className="text-xs text-toec-green-dark hover:underline mt-1.5">
                  + Ajouter une série
                </button>
              </div>
            )),
          )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire sur la séance</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Ressenti, fatigue, douleur..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving || loading}
          className="bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2 disabled:opacity-60"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </Modal>
  );
}

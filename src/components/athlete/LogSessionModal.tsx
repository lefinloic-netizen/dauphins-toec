import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { toISODate } from "../../lib/dates";
import { readLocalStorage, writeLocalStorage, clearLocalStorage } from "../../lib/draftStorage";
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

interface LoggableExercise {
  key: string;
  displayName: string;
  plannedSets: string | null;
  plannedReps: string | null;
  exerciseId: string | null;
  exerciseName: string;
}

interface DraftShape {
  comment: string;
  rpe: string;
  sets: Record<string, SetRow[]>;
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

// Un même exercice peut apparaître dans plusieurs blocs de la séance (ex: en
// échauffement puis en bloc principal). On le regroupe en une seule entrée à
// logger — sinon ses séries étaient comptées et ré-enregistrées une fois par
// bloc où il apparaît, doublant le nombre de séries à chaque modification.
function buildLoggableExercises(blocks: SessionBlockView[]): LoggableExercise[] {
  const map = new Map<string, LoggableExercise>();
  for (const block of blocks) {
    for (const ex of block.exercises) {
      const key = ex.exercise_id ?? `name:${ex.exercise_name.trim().toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          displayName: ex.exercise_name,
          plannedSets: ex.sets,
          plannedReps: ex.reps,
          exerciseId: ex.exercise_id,
          exerciseName: ex.exercise_name,
        });
      }
    }
  }
  return Array.from(map.values());
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
  const draftKey = `toec:log-session-draft:${sessionId}`;

  const [loggable, setLoggable] = useState<LoggableExercise[]>([]);
  const [setsByExercise, setSetsByExercise] = useState<Record<string, SetRow[]>>({});
  const [comment, setComment] = useState("");
  const [rpe, setRpe] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const items = buildLoggableExercises(blocks);
      setLoggable(items);

      const { data: noteData } = await supabase
        .from("session_athlete_notes")
        .select("comment, rpe")
        .eq("session_id", sessionId)
        .eq("athlete_id", athleteId)
        .maybeSingle();

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

      const baseline: Record<string, SetRow[]> = {};
      for (const item of items) {
        if (item.exerciseId && byExercise[item.exerciseId]) {
          baseline[item.key] = byExercise[item.exerciseId];
        } else {
          const count = parseSetsCount(item.plannedSets);
          baseline[item.key] = Array.from({ length: count }, () => ({ reps: defaultReps(item.plannedReps), weight: "" }));
        }
      }

      // Un brouillon local (non encore enregistré) est plus récent que ce qui est en
      // base — il prend le dessus s'il existe.
      const draft = readLocalStorage<DraftShape>(draftKey);
      setComment(draft?.comment ?? noteData?.comment ?? "");
      setRpe(draft?.rpe ?? noteData?.rpe?.toString() ?? "");
      setSetsByExercise(draft ? { ...baseline, ...draft.sets } : baseline);
      setLoading(false);
    }
    init();
  }, [sessionId, athleteId, blocks]);

  useEffect(() => {
    if (loading) return;
    writeLocalStorage(draftKey, { comment, rpe, sets: setsByExercise });
  }, [comment, rpe, setsByExercise, loading]);

  function updateSet(key: string, index: number, patch: Partial<SetRow>) {
    setSetsByExercise((prev) => ({
      ...prev,
      [key]: prev[key].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function addSet(key: string) {
    setSetsByExercise((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), { reps: "", weight: "" }] }));
  }

  function removeSet(key: string, index: number) {
    setSetsByExercise((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from("performances")
      .delete()
      .eq("athlete_id", athleteId)
      .eq("session_id", sessionId);

    if (deleteError) {
      setSaving(false);
      setError(deleteError.message);
      return;
    }

    for (const item of loggable) {
      const rows = (setsByExercise[item.key] ?? []).filter((r) => r.weight.trim() !== "");
      if (rows.length === 0) continue;

      let exerciseId = item.exerciseId;
      if (!exerciseId) {
        const { data: found } = await supabase
          .from("exercises")
          .select("id")
          .ilike("name", item.exerciseName)
          .maybeSingle();
        if (found) {
          exerciseId = found.id;
        } else {
          const { data: created } = await supabase
            .from("exercises")
            .insert({ name: item.exerciseName, category: "musculation" })
            .select("id")
            .single();
          exerciseId = created?.id ?? null;
        }
      }
      if (!exerciseId) continue;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error: insertError } = await supabase.from("performances").insert({
          athlete_id: athleteId,
          exercise_id: exerciseId,
          value_kg: Number(r.weight),
          date: sessionDate ?? toISODate(new Date()),
          session_id: sessionId,
          set_number: i + 1,
          reps: r.reps ? Number(r.reps) : null,
        });
        if (insertError) {
          setSaving(false);
          setError(insertError.message);
          return;
        }
      }
    }

    const { error: noteError } = await supabase.from("session_athlete_notes").upsert(
      { session_id: sessionId, athlete_id: athleteId, comment: comment || null, rpe: rpe ? Number(rpe) : null },
      { onConflict: "session_id,athlete_id" },
    );

    setSaving(false);

    if (noteError) {
      setError(noteError.message);
      return;
    }

    clearLocalStorage(draftKey);
    onSaved();
  }

  return (
    <Modal title={`Mes perfs — ${sessionName}`} onClose={onClose}>
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
        {loading && <p className="text-sm text-gray-400">Chargement...</p>}

        {!loading && loggable.length === 0 && (
          <p className="text-sm text-gray-400">Aucun exercice de musculation renseigné pour cette séance.</p>
        )}

        {!loading &&
          loggable.map((item) => (
            <div key={item.key} className="border border-gray-200 rounded-xl p-3">
              <div className="font-medium text-sm text-gray-800 mb-2">{item.displayName}</div>
              <div className="flex flex-col gap-1.5">
                {(setsByExercise[item.key] ?? []).map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-12 shrink-0">Série {i + 1}</span>
                    <input
                      type="number"
                      placeholder="reps"
                      value={row.reps}
                      onChange={(e) => updateSet(item.key, i, { reps: e.target.value })}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
                    />
                    <input
                      type="number"
                      step="0.5"
                      placeholder="kg"
                      value={row.weight}
                      onChange={(e) => updateSet(item.key, i, { weight: e.target.value })}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
                    />
                    <button onClick={() => removeSet(item.key, i)} className="text-gray-300 hover:text-red-600 text-sm">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => addSet(item.key)} className="text-xs text-toec-green-dark hover:underline mt-1.5">
                + Ajouter une série
              </button>
            </div>
          ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Difficulté ressentie (RPE){rpe && <span className="text-toec-green-dark"> — {rpe}/10</span>}
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={rpe || "5"}
            onChange={(e) => setRpe(e.target.value)}
            className="w-full accent-toec-green"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>1 — très facile</span>
            <span>10 — extrême</span>
          </div>
        </div>

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

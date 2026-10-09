import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { formatFRDate } from "../../lib/dates";
import { formatValue, unitForCategory } from "../../lib/units";
import type { Exercise } from "../../types/database";
import type { SessionWithGroup } from "../../types/views";
import LogSessionModal from "./LogSessionModal";

export interface SessionWithWarmup extends SessionWithGroup {
  warmup_text: string | null;
}

interface SessionExerciseView {
  id: string;
  exercise_name: string;
  exercise_id: string | null;
  sets: string | null;
  reps: string | null;
  charge_rpe: string | null;
  tempo: string | null;
  recovery: string | null;
}

interface SessionBlockView {
  id: string;
  title: string;
  exercises: SessionExerciseView[];
}

interface MyLoggedExercise {
  name: string;
  unit: ReturnType<typeof unitForCategory>;
  sets: { value_kg: number; reps: number | null }[];
}

interface MySessionLog {
  comment: string | null;
  rpe: number | null;
  exercises: Record<string, MyLoggedExercise>;
}

const slotLabels: Record<string, string> = { matin: "Matin", apres_midi: "Après-midi", soir: "Soir" };

export default function AthleteSessionList({
  athleteId,
  sessions,
  onLogged,
}: {
  athleteId: string;
  sessions: SessionWithWarmup[];
  onLogged?: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsCache, setDetailsCache] = useState<Record<string, SessionBlockView[]>>({});
  const [myLogCache, setMyLogCache] = useState<Record<string, MySessionLog | null>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [loggingSession, setLoggingSession] = useState<SessionWithWarmup | null>(null);

  async function loadMyLog(sessionId: string) {
    const { data: noteData } = await supabase
      .from("session_athlete_notes")
      .select("comment, rpe")
      .eq("session_id", sessionId)
      .eq("athlete_id", athleteId)
      .maybeSingle();

    const { data: perfsData } = await supabase
      .from("performances")
      .select("exercise_id, value_kg, reps, set_number, exercise:exercises(name, category)")
      .eq("session_id", sessionId)
      .eq("athlete_id", athleteId)
      .order("set_number");

    const perfs =
      (perfsData as unknown as {
        exercise_id: string;
        value_kg: number;
        reps: number | null;
        exercise: { name: string; category: Exercise["category"] };
      }[]) ?? [];

    if (!noteData && perfs.length === 0) {
      setMyLogCache((c) => ({ ...c, [sessionId]: null }));
      return;
    }

    const exercisesLog: Record<string, MyLoggedExercise> = {};
    for (const p of perfs) {
      if (!exercisesLog[p.exercise_id]) {
        exercisesLog[p.exercise_id] = {
          name: p.exercise?.name ?? "Exercice",
          unit: unitForCategory(p.exercise?.category ?? "musculation"),
          sets: [],
        };
      }
      exercisesLog[p.exercise_id].sets.push({ value_kg: p.value_kg, reps: p.reps });
    }

    setMyLogCache((c) => ({
      ...c,
      [sessionId]: { comment: noteData?.comment ?? null, rpe: noteData?.rpe ?? null, exercises: exercisesLog },
    }));
  }

  async function toggleExpand(sessionId: string) {
    if (expandedId === sessionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sessionId);
    if (detailsCache[sessionId]) return;

    setLoadingDetailId(sessionId);
    const { data: blocksData } = await supabase
      .from("session_blocks")
      .select("id, title")
      .eq("session_id", sessionId)
      .order("order_index");

    const blocks: SessionBlockView[] = [];
    for (const b of blocksData ?? []) {
      const { data: exData } = await supabase
        .from("session_exercises")
        .select("id, exercise_name, exercise_id, sets, reps, charge_rpe, tempo, recovery")
        .eq("block_id", b.id)
        .order("order_index");
      blocks.push({ id: b.id, title: b.title, exercises: (exData as SessionExerciseView[]) ?? [] });
    }

    setDetailsCache((c) => ({ ...c, [sessionId]: blocks }));
    await loadMyLog(sessionId);
    setLoadingDetailId(null);
  }

  if (sessions.length === 0) {
    return <p className="text-sm text-gray-400">Aucune séance sur cette période.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {sessions.map((s) => {
        const isOpen = expandedId === s.id;
        const blocks = detailsCache[s.id];
        return (
          <div key={s.id} className="border-l-4 rounded-lg bg-gray-50 overflow-hidden" style={{ borderColor: s.group?.color ?? "#9ca3af" }}>
            <button onClick={() => toggleExpand(s.id)} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{s.name}</div>
                <div className="text-xs text-gray-400">
                  {s.date && formatFRDate(s.date)} · {s.group?.name ?? "Sans groupe"} · {slotLabels[s.time_slot ?? "matin"]}
                  {s.duration_minutes ? ` · ${s.duration_minutes} min` : ""}
                </div>
              </div>
              <span className="text-gray-400 text-xs shrink-0">{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
              <div className="px-3 pb-3 flex flex-col gap-3">
                {loadingDetailId === s.id && <p className="text-xs text-gray-400">Chargement...</p>}

                {s.warmup_text && (
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-500 mb-1">Échauffement</div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.warmup_text}</p>
                  </div>
                )}

                {blocks?.map((block) => (
                  <div key={block.id} className="bg-white rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-500 mb-2">{block.title}</div>
                    {block.exercises.length === 0 ? (
                      <p className="text-sm text-gray-400">—</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {block.exercises.map((ex) => (
                          <div key={ex.id} className="text-sm text-gray-700">
                            <div className="font-medium">{ex.exercise_name}</div>
                            <div className="text-xs text-gray-400">
                              {[
                                ex.sets && `${ex.sets} séries`,
                                ex.reps && `${ex.reps} reps`,
                                ex.charge_rpe,
                                ex.tempo && `tempo ${ex.tempo}`,
                                ex.recovery && `récup ${ex.recovery}`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {blocks && blocks.length === 0 && !s.warmup_text && (
                  <p className="text-sm text-gray-400">Aucun détail renseigné pour cette séance.</p>
                )}

                {myLogCache[s.id] && (
                  <div className="bg-toec-green-light rounded-lg p-3">
                    <div className="text-xs font-semibold text-toec-green-dark mb-2 uppercase tracking-wide">Ce que j'ai fait</div>
                    {myLogCache[s.id]!.rpe && (
                      <p className="text-sm text-toec-green-dark font-medium mb-1">RPE : {myLogCache[s.id]!.rpe}/10</p>
                    )}
                    {Object.entries(myLogCache[s.id]!.exercises).map(([exId, ex]) => (
                      <div key={exId} className="text-sm text-toec-green-dark mb-1">
                        <span className="font-medium">{ex.name}</span> :{" "}
                        {ex.sets.map((set, i) => (
                          <span key={i}>
                            {i > 0 && ", "}
                            {formatValue(set.value_kg, ex.unit)}
                            {set.reps ? `×${set.reps}` : ""}
                          </span>
                        ))}
                      </div>
                    ))}
                    {myLogCache[s.id]!.comment && (
                      <p className="text-sm text-toec-green-dark italic mt-1">« {myLogCache[s.id]!.comment} »</p>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setLoggingSession(s)}
                  className="self-start text-sm bg-toec-green hover:bg-toec-green-dark text-white rounded-lg px-3 py-1.5 font-medium"
                >
                  {myLogCache[s.id] ? "Modifier mes perfs de cette séance" : "Enregistrer mes perfs de cette séance"}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {loggingSession && (
        <LogSessionModal
          athleteId={athleteId}
          sessionId={loggingSession.id}
          sessionDate={loggingSession.date}
          sessionName={loggingSession.name}
          blocks={detailsCache[loggingSession.id] ?? []}
          onClose={() => setLoggingSession(null)}
          onSaved={() => {
            const sessionId = loggingSession.id;
            setLoggingSession(null);
            loadMyLog(sessionId);
            onLogged?.();
          }}
        />
      )}
    </div>
  );
}

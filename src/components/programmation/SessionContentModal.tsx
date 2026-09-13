import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Modal from "../Modal";

interface SessionExerciseView {
  id: string;
  exercise_name: string;
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

export default function SessionContentModal({
  sessionId,
  sessionName,
  onClose,
}: {
  sessionId: string;
  sessionName: string;
  onClose: () => void;
}) {
  const [warmupText, setWarmupText] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<SessionBlockView[] | null>(null);

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.from("sessions").select("warmup_text").eq("id", sessionId).single();
      setWarmupText(session?.warmup_text ?? null);

      const { data: blocksData } = await supabase
        .from("session_blocks")
        .select("id, title")
        .eq("session_id", sessionId)
        .order("order_index");

      const result: SessionBlockView[] = [];
      for (const b of blocksData ?? []) {
        const { data: exData } = await supabase
          .from("session_exercises")
          .select("id, exercise_name, sets, reps, charge_rpe, tempo, recovery")
          .eq("block_id", b.id)
          .order("order_index");
        result.push({ id: b.id, title: b.title, exercises: (exData as SessionExerciseView[]) ?? [] });
      }
      setBlocks(result);
    }
    load();
  }, [sessionId]);

  return (
    <Modal title={sessionName} onClose={onClose}>
      <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
        {blocks === null && <p className="text-sm text-gray-400">Chargement...</p>}

        {warmupText && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-500 mb-1">Échauffement</div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{warmupText}</p>
          </div>
        )}

        {blocks?.map((block) => (
          <div key={block.id} className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-500 mb-2">{block.title}</div>
            {block.exercises.length === 0 ? (
              <p className="text-sm text-gray-400">—</p>
            ) : (
              <div className="flex flex-col gap-1">
                {block.exercises.map((ex) => (
                  <div key={ex.id} className="text-sm text-gray-700">
                    <span className="font-medium">{ex.exercise_name}</span>
                    <span className="text-xs text-gray-400">
                      {" "}
                      {[
                        ex.sets && `${ex.sets} séries`,
                        ex.reps && `${ex.reps} reps`,
                        ex.charge_rpe,
                        ex.tempo && `tempo ${ex.tempo}`,
                        ex.recovery,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {blocks && blocks.length === 0 && !warmupText && (
          <p className="text-sm text-gray-400">Aucun détail renseigné pour cette séance.</p>
        )}
      </div>
    </Modal>
  );
}

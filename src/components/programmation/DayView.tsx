import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SessionWithGroup } from "../../types/views";
import SessionContentModal from "./SessionContentModal";

const slotLabels: Record<string, string> = {
  matin: "Matin",
  apres_midi: "Après-midi",
  soir: "Soir",
};

export default function DayView({
  sessions,
  onDelete,
}: {
  sessions: SessionWithGroup[];
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [viewingSession, setViewingSession] = useState<SessionWithGroup | null>(null);
  const sorted = [...sessions].sort((a, b) => (a.time_slot ?? "").localeCompare(b.time_slot ?? ""));

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
        Aucune séance ce jour-là.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((s) => (
        <div key={s.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between gap-4">
          <button
            onClick={() => setViewingSession(s)}
            className="flex items-center gap-3 min-w-0 text-left hover:opacity-80"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: s.group?.color ?? "#9ca3af" }}
            />
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">{s.name}</div>
              <div className="text-xs text-gray-400">
                {s.group?.name ?? "Sans groupe"} · {slotLabels[s.time_slot ?? "matin"]}
                {s.duration_minutes ? ` · ${s.duration_minutes} min` : ""}
              </div>
            </div>
          </button>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate("/creer-seance", { state: { editSessionId: s.id } })}
              className="text-toec-green-dark hover:underline text-sm"
            >
              Modifier
            </button>
            <button
              onClick={() => navigate("/creer-seance", { state: { duplicateSessionId: s.id } })}
              className="text-toec-green-dark hover:underline text-sm"
            >
              Dupliquer
            </button>
            <button
              onClick={() => {
                if (confirm(`Supprimer la séance "${s.name}" ?`)) onDelete(s.id);
              }}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Supprimer
            </button>
          </div>
        </div>
      ))}

      {viewingSession && (
        <SessionContentModal
          sessionId={viewingSession.id}
          sessionName={viewingSession.name}
          onClose={() => setViewingSession(null)}
        />
      )}
    </div>
  );
}

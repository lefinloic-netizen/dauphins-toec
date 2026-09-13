import { Fragment, useState } from "react";
import { addDays, startOfWeek, toISODate, WEEKDAY_LABELS } from "../../lib/dates";
import type { SessionWithGroup } from "../../types/views";
import SessionContentModal from "./SessionContentModal";

const slots: { key: string; label: string }[] = [
  { key: "matin", label: "Matin" },
  { key: "apres_midi", label: "Après-midi" },
  { key: "soir", label: "Soir" },
];

export default function WeekView({ refDate, sessions }: { refDate: Date; sessions: SessionWithGroup[] }) {
  const start = startOfWeek(refDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [viewingSession, setViewingSession] = useState<SessionWithGroup | null>(null);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
      <div className="grid grid-cols-[80px_repeat(7,minmax(120px,1fr))] min-w-[900px]">
        <div className="p-2" />
        {days.map((d, i) => (
          <div key={i} className="p-2 text-center border-b border-gray-100">
            <div className="text-xs text-gray-400">{WEEKDAY_LABELS[i]}</div>
            <div className="text-sm font-medium text-gray-700">{d.getDate()}</div>
          </div>
        ))}

        {slots.map((slot) => (
          <Fragment key={slot.key}>
            <div className="p-2 text-xs font-medium text-gray-400 border-t border-gray-100 flex items-center">
              {slot.label}
            </div>
            {days.map((d, i) => {
              const iso = toISODate(d);
              const daySessions = sessions.filter((s) => s.date === iso && (s.time_slot ?? "matin") === slot.key);
              return (
                <div key={`${slot.key}-${i}`} className="p-1.5 border-t border-l border-gray-100 min-h-[64px]">
                  {daySessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setViewingSession(s)}
                      className="block w-full text-left text-white text-xs rounded-md px-2 py-1 mb-1 truncate hover:opacity-80"
                      style={{ backgroundColor: s.group?.color ?? "#9ca3af" }}
                      title={s.name}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>

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

import { useState } from "react";
import { monthGrid, toISODate, WEEKDAY_LABELS } from "../../lib/dates";
import type { SessionWithGroup } from "../../types/views";
import SessionContentModal from "./SessionContentModal";

export default function MonthView({
  refDate,
  sessions,
  onDayClick,
}: {
  refDate: Date;
  sessions: SessionWithGroup[];
  onDayClick: (date: Date) => void;
}) {
  const cells = monthGrid(refDate);
  const currentMonth = refDate.getMonth();
  const [viewingSession, setViewingSession] = useState<SessionWithGroup | null>(null);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-gray-400 py-2 border-b border-gray-100">
            {label}
          </div>
        ))}
        {cells.map((day, i) => {
          const iso = toISODate(day);
          const daySessions = sessions.filter((s) => s.date === iso);
          const inMonth = day.getMonth() === currentMonth;
          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={`text-left border-t border-l border-gray-100 min-h-[90px] p-1.5 hover:bg-gray-50 transition-colors cursor-pointer ${
                inMonth ? "" : "bg-gray-50/60 text-gray-300"
              }`}
            >
              <div className={`text-xs mb-1 ${inMonth ? "text-gray-600" : "text-gray-300"}`}>{day.getDate()}</div>
              <div className="flex flex-col gap-0.5">
                {daySessions.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingSession(s);
                    }}
                    className="block w-full text-left text-[10px] text-white rounded px-1 py-0.5 truncate hover:opacity-80"
                    style={{ backgroundColor: s.group?.color ?? "#9ca3af" }}
                  >
                    {s.name}
                  </button>
                ))}
                {daySessions.length > 3 && (
                  <div className="text-[10px] text-gray-400">+{daySessions.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
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

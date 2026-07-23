import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { addDays, formatDayLabel, formatMonthLabel, formatWeekLabel, monthGrid, toISODate } from "../lib/dates";
import type { Group } from "../types/database";
import type { SessionWithGroup } from "../types/views";
import DayView from "../components/programmation/DayView";
import WeekView from "../components/programmation/WeekView";
import MonthView from "../components/programmation/MonthView";

type ViewMode = "jour" | "semaine" | "mois";

const viewLabels: Record<ViewMode, string> = { jour: "Jour", semaine: "Semaine", mois: "Mois" };

export default function Programmation() {
  const [viewMode, setViewMode] = useState<ViewMode>("semaine");
  const [refDate, setRefDate] = useState(new Date());
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [groups, setGroups] = useState<Group[]>([]);
  const [sessions, setSessions] = useState<SessionWithGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("groups")
      .select("*")
      .order("name")
      .then(({ data }) => setGroups((data as Group[]) ?? []));
  }, []);

  useEffect(() => {
    loadSessions();
  }, [viewMode, refDate, groupFilter]);

  function rangeForView(): [string, string] {
    if (viewMode === "jour") {
      const iso = toISODate(refDate);
      return [iso, iso];
    }
    if (viewMode === "semaine") {
      const start = addDays(refDate, -((refDate.getDay() + 6) % 7));
      const end = addDays(start, 6);
      return [toISODate(start), toISODate(end)];
    }
    const cells = monthGrid(refDate);
    return [toISODate(cells[0]), toISODate(cells[cells.length - 1])];
  }

  async function loadSessions() {
    setLoading(true);
    const [start, end] = rangeForView();
    let query = supabase
      .from("sessions")
      .select("id, name, date, duration_minutes, time_slot, is_template, group:groups(id, name, color)")
      .eq("is_template", false)
      .gte("date", start)
      .lte("date", end);
    if (groupFilter !== "all") query = query.eq("group_id", groupFilter);
    const { data } = await query;
    setSessions((data as unknown as SessionWithGroup[]) ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("sessions").delete().eq("id", id);
    loadSessions();
  }

  function navigate(delta: number) {
    if (viewMode === "jour") setRefDate((d) => addDays(d, delta));
    else if (viewMode === "semaine") setRefDate((d) => addDays(d, delta * 7));
    else setRefDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  function jumpToDay(date: Date) {
    setRefDate(date);
    setViewMode("jour");
  }

  const periodLabel =
    viewMode === "jour" ? formatDayLabel(refDate) : viewMode === "semaine" ? formatWeekLabel(refDate) : formatMonthLabel(refDate);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(Object.keys(viewLabels) as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode ? "bg-toec-green text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {viewLabels[mode]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center"
            aria-label="Précédent"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center capitalize">
            {periodLabel}
          </span>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center"
            aria-label="Suivant"
          >
            ›
          </button>
        </div>

        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
        >
          <option value="all">Tous les groupes</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Chargement...</div>
      ) : viewMode === "jour" ? (
        <DayView sessions={sessions} onDelete={handleDelete} />
      ) : viewMode === "semaine" ? (
        <WeekView refDate={refDate} sessions={sessions} />
      ) : (
        <MonthView refDate={refDate} sessions={sessions} onDayClick={jumpToDay} />
      )}
    </div>
  );
}

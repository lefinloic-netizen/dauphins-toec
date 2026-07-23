import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { formatFRDate } from "../lib/dates";
import type { Group } from "../types/database";
import type { SessionWithGroup } from "../types/views";

interface SessionExerciseView {
  id: string;
  exercise_name: string;
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

interface AthleteLog {
  athleteId: string;
  name: string;
  comment: string | null;
  exercises: Record<string, { reps: number | null; value_kg: number }[]>;
  exerciseNames: Record<string, string>;
}

interface Attendance {
  loggedCount: number;
  totalCount: number;
  missingNames: string[];
}

export default function Historique() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionWithGroup[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [blocksCache, setBlocksCache] = useState<Record<string, SessionBlockView[]>>({});
  const [logsCache, setLogsCache] = useState<Record<string, AthleteLog[]>>({});
  const [attendanceCache, setAttendanceCache] = useState<Record<string, Attendance>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  async function loadGroups() {
    const { data } = await supabase.from("groups").select("*").order("name");
    setGroups((data as Group[]) ?? []);
  }

  async function loadSessions() {
    setLoading(true);
    let query = supabase
      .from("sessions")
      .select("id, name, date, duration_minutes, time_slot, is_template, group:groups(id, name, color)")
      .eq("is_template", false)
      .order("date", { ascending: false });
    if (groupFilter !== "all") query = query.eq("group_id", groupFilter);
    const { data } = await query;
    setSessions((data as unknown as SessionWithGroup[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    loadSessions();
  }, [groupFilter]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer la séance "${name}" ?`)) return;
    await supabase.from("sessions").delete().eq("id", id);
    loadSessions();
  }

  async function toggleExpand(sessionId: string) {
    if (expandedId === sessionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sessionId);
    if (blocksCache[sessionId]) return;

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
        .select("id, exercise_name, sets, reps, charge_rpe, recovery")
        .eq("block_id", b.id)
        .order("order_index");
      blocks.push({ id: b.id, title: b.title, exercises: (exData as SessionExerciseView[]) ?? [] });
    }
    setBlocksCache((c) => ({ ...c, [sessionId]: blocks }));

    const { data: notesData } = await supabase
      .from("session_athlete_notes")
      .select("athlete_id, comment, athlete:athletes(profile:profiles(first_name, last_name))")
      .eq("session_id", sessionId);

    const notes =
      (notesData as unknown as { athlete_id: string; comment: string | null; athlete: { profile: { first_name: string; last_name: string } } }[]) ??
      [];

    const logsByAthlete: Record<string, AthleteLog> = {};
    for (const n of notes) {
      logsByAthlete[n.athlete_id] = {
        athleteId: n.athlete_id,
        name: `${n.athlete.profile.first_name} ${n.athlete.profile.last_name}`,
        comment: n.comment,
        exercises: {},
        exerciseNames: {},
      };
    }

    const { data: perfsData } = await supabase
      .from("performances")
      .select("athlete_id, exercise_id, value_kg, reps, set_number, exercise:exercises(name)")
      .eq("session_id", sessionId)
      .order("set_number");

    const perfs =
      (perfsData as unknown as {
        athlete_id: string;
        exercise_id: string;
        value_kg: number;
        reps: number | null;
        exercise: { name: string };
      }[]) ?? [];

    for (const p of perfs) {
      if (!logsByAthlete[p.athlete_id]) {
        logsByAthlete[p.athlete_id] = {
          athleteId: p.athlete_id,
          name: "Athlète",
          comment: null,
          exercises: {},
          exerciseNames: {},
        };
      }
      const log = logsByAthlete[p.athlete_id];
      (log.exercises[p.exercise_id] ??= []).push({ reps: p.reps, value_kg: p.value_kg });
      log.exerciseNames[p.exercise_id] = p.exercise?.name ?? "Exercice";
    }

    setLogsCache((c) => ({ ...c, [sessionId]: Object.values(logsByAthlete) }));

    const session = sessions.find((s) => s.id === sessionId);
    if (session?.group?.id) {
      const { data: membersData } = await supabase
        .from("athlete_groups")
        .select("athlete_id, athlete:athletes(profile:profiles(first_name, last_name))")
        .eq("group_id", session.group.id);

      const members =
        (membersData as unknown as { athlete_id: string; athlete: { profile: { first_name: string; last_name: string } } }[]) ?? [];

      const loggedIds = new Set(Object.keys(logsByAthlete));
      const missingNames = members
        .filter((m) => !loggedIds.has(m.athlete_id))
        .map((m) => `${m.athlete.profile.first_name} ${m.athlete.profile.last_name}`);

      setAttendanceCache((c) => ({
        ...c,
        [sessionId]: { loggedCount: loggedIds.size, totalCount: members.length, missingNames },
      }));
    }

    setLoadingDetailId(null);
  }

  return (
    <div className="max-w-3xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-lg">Historique des séances</h2>
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

      {loading && <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Chargement...</div>}

      {!loading && sessions.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Aucune séance enregistrée.</div>
      )}

      <div className="flex flex-col gap-2">
        {sessions.map((s) => {
          const isOpen = expandedId === s.id;
          const blocks = blocksCache[s.id];
          const logs = logsCache[s.id];
          const attendance = attendanceCache[s.id];
          return (
            <div key={s.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-stretch">
                <div className="w-1.5 shrink-0" style={{ backgroundColor: s.group?.color ?? "#9ca3af" }} />
                <button onClick={() => toggleExpand(s.id)} className="flex-1 p-4 flex items-center justify-between gap-4 text-left">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{s.name}</div>
                    <div className="text-xs text-gray-400">
                      {s.date && formatFRDate(s.date)} · {s.group?.name ?? "Sans groupe"}
                      {s.duration_minutes ? ` · ${s.duration_minutes} min` : ""}
                    </div>
                  </div>
                  <span className="text-gray-400 text-xs shrink-0">{isOpen ? "▲" : "▼"}</span>
                </button>
                <div className="flex items-center gap-3 shrink-0 pr-4">
                  <button
                    onClick={() => navigate("/creer-seance", { state: { editSessionId: s.id } })}
                    className="text-sm text-toec-green-dark hover:underline"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => navigate("/creer-seance", { state: { duplicateSessionId: s.id } })}
                    className="text-sm text-toec-green-dark hover:underline"
                  >
                    Dupliquer
                  </button>
                  <button onClick={() => handleDelete(s.id, s.name)} className="text-sm text-red-500 hover:text-red-700">
                    Supprimer
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="px-4 pb-4 pl-6 flex flex-col gap-3">
                  {loadingDetailId === s.id && <p className="text-xs text-gray-400">Chargement...</p>}

                  {blocks && blocks.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {blocks.map((block) => (
                        <div key={block.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs font-semibold text-gray-500 mb-1.5">{block.title}</div>
                          {block.exercises.length === 0 ? (
                            <p className="text-sm text-gray-400">—</p>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {block.exercises.map((ex) => (
                                <div key={ex.id} className="text-sm text-gray-700">
                                  <span className="font-medium">{ex.exercise_name}</span>
                                  <span className="text-xs text-gray-400">
                                    {" "}
                                    {[ex.sets && `${ex.sets} séries`, ex.reps && `${ex.reps} reps`, ex.charge_rpe, ex.recovery]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {attendance && (
                    <div className="bg-toec-green-light rounded-lg p-3">
                      <div className="text-sm font-medium text-toec-green-dark">
                        {attendance.loggedCount}/{attendance.totalCount} athlète{attendance.totalCount > 1 ? "s" : ""} du groupe {attendance.loggedCount > 1 ? "ont" : "a"} renseigné cette séance
                      </div>
                      {attendance.missingNames.length > 0 && (
                        <p className="text-xs text-toec-green-dark/80 mt-1">
                          Manquant{attendance.missingNames.length > 1 ? "s" : ""} : {attendance.missingNames.join(", ")}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                      Retours des athlètes
                    </div>
                    {(!logs || logs.length === 0) && (
                      <p className="text-sm text-gray-400">Aucun athlète n'a encore renseigné cette séance.</p>
                    )}
                    {logs && logs.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {logs.map((log) => (
                          <div key={log.athleteId} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="text-sm font-medium text-gray-800 mb-1">{log.name}</div>
                            {Object.keys(log.exercises).length > 0 && (
                              <div className="flex flex-col gap-1 mb-1.5">
                                {Object.entries(log.exercises).map(([exerciseId, sets]) => (
                                  <div key={exerciseId} className="text-xs text-gray-600">
                                    <span className="font-medium">{log.exerciseNames[exerciseId]}</span> :{" "}
                                    {sets.map((s) => `${s.value_kg}kg${s.reps ? `×${s.reps}` : ""}`).join(", ")}
                                  </div>
                                ))}
                              </div>
                            )}
                            {log.comment && <p className="text-sm text-gray-600 italic">« {log.comment} »</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

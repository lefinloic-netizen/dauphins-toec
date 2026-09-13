import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { calcAge } from "../lib/age";
import { addDays, formatFRDate, toISODate } from "../lib/dates";
import { formatValue, unitForCategory } from "../lib/units";
import type { Athlete, Exercise } from "../types/database";
import type { AthleteTagRow, RecordRow, PerformancePoint, SessionWithGroup } from "../types/views";
import PerfChart from "../components/dashboard/PerfChart";
import AddPerfModal from "../components/dashboard/AddPerfModal";
import LogSessionModal from "../components/athlete/LogSessionModal";

const tagStyles: Record<string, string> = {
  fort: "bg-green-100 text-green-800",
  faible: "bg-red-100 text-red-800",
  a_travailler: "bg-orange-100 text-orange-800",
};

const tagTitles: Record<string, string> = {
  fort: "Points forts",
  faible: "Points faibles",
  a_travailler: "À travailler",
};

const slotLabels: Record<string, string> = { matin: "Matin", apres_midi: "Après-midi", soir: "Soir" };

interface UpcomingSession extends SessionWithGroup {
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
  exercises: Record<string, MyLoggedExercise>;
}

export default function AthleteHome() {
  const { profile } = useAuth();
  const athleteId = profile!.id;

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [groupBadges, setGroupBadges] = useState<{ id: string; name: string; color: string }[]>([]);
  const [tags, setTags] = useState<AthleteTagRow[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [perfPoints, setPerfPoints] = useState<PerformancePoint[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingSession[]>([]);
  const [addPerfOpen, setAddPerfOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsCache, setDetailsCache] = useState<Record<string, SessionBlockView[]>>({});
  const [myLogCache, setMyLogCache] = useState<Record<string, MySessionLog | null>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [loggingSession, setLoggingSession] = useState<UpcomingSession | null>(null);

  async function loadAll() {
    const { data: athleteData } = await supabase.from("athletes").select("*").eq("id", athleteId).single();
    setAthlete((athleteData as Athlete) ?? null);

    const { data: groupsData } = await supabase
      .from("athlete_groups")
      .select("group:groups(id, name, color)")
      .eq("athlete_id", athleteId);
    const groupsList = ((groupsData as unknown as { group: { id: string; name: string; color: string } }[]) ?? []).map(
      (g) => g.group,
    );
    setGroupBadges(groupsList);

    const { data: tagsData } = await supabase
      .from("athlete_tags")
      .select("id, athlete_id, type, label, source")
      .eq("athlete_id", athleteId);
    setTags((tagsData as AthleteTagRow[]) ?? []);

    const { data: recordsData } = await supabase
      .from("athlete_records")
      .select("exercise_id, record_kg, exercise:exercises(name, category, is_record)")
      .eq("athlete_id", athleteId);
    setRecords(((recordsData as unknown as RecordRow[]) ?? []).filter((r) => r.exercise?.is_record));

    const { data: exercisesData } = await supabase.from("exercises").select("*").eq("is_record", true).order("name");
    const exList = (exercisesData as Exercise[]) ?? [];
    setExercises(exList);
    if (exList.length > 0) setSelectedExerciseId((prev) => prev || exList[0].id);

    if (groupsList.length > 0) {
      const groupIds = groupsList.map((g) => g.id);
      const windowStart = toISODate(addDays(new Date(), -7));
      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("id, name, date, duration_minutes, time_slot, is_template, warmup_text, group:groups(id, name, color)")
        .eq("is_template", false)
        .in("group_id", groupIds)
        .gte("date", windowStart)
        .order("date", { ascending: false })
        .limit(15);
      setUpcoming((sessionsData as unknown as UpcomingSession[]) ?? []);
    }
  }

  async function loadMyLog(sessionId: string) {
    const { data: noteData } = await supabase
      .from("session_athlete_notes")
      .select("comment")
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
        exercisesLog[p.exercise_id] = { name: p.exercise?.name ?? "Exercice", unit: unitForCategory(p.exercise?.category ?? "musculation"), sets: [] };
      }
      exercisesLog[p.exercise_id].sets.push({ value_kg: p.value_kg, reps: p.reps });
    }

    setMyLogCache((c) => ({ ...c, [sessionId]: { comment: noteData?.comment ?? null, exercises: exercisesLog } }));
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

  useEffect(() => {
    loadAll();
  }, [athleteId]);

  useEffect(() => {
    if (!selectedExerciseId) return;
    supabase
      .from("performances")
      .select("id, value_kg, date")
      .eq("athlete_id", athleteId)
      .eq("exercise_id", selectedExerciseId)
      .then(({ data }) => setPerfPoints((data as PerformancePoint[]) ?? []));
  }, [selectedExerciseId, athleteId]);

  const age = calcAge(athlete?.birth_date ?? null);
  const selectedRecord = records.find((r) => r.exercise_id === selectedExerciseId);
  const selectedExercise = exercises.find((ex) => ex.id === selectedExerciseId);
  const selectedUnit = unitForCategory(selectedExercise?.category ?? "musculation");

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h1 className="text-lg font-semibold text-gray-900">
          {profile!.first_name} {profile!.last_name}
        </h1>
        <div className="flex flex-wrap gap-1.5 mt-1.5 mb-3">
          {groupBadges.map((g) => (
            <span key={g.id} className="text-xs font-medium text-white rounded-full px-2 py-0.5" style={{ backgroundColor: g.color }}>
              {g.name}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-gray-400">Âge</div>
            <div className="font-semibold text-gray-800">{age !== null ? `${age} ans` : "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Poids</div>
            <div className="font-semibold text-gray-800">{athlete?.weight_kg ? `${athlete.weight_kg} kg` : "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Taille</div>
            <div className="font-semibold text-gray-800">{athlete?.height_cm ? `${athlete.height_cm} cm` : "—"}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Records</h2>
        {records.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun record enregistré.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {records.map((r) => (
              <div key={r.exercise_id} className="bg-toec-green-light text-toec-green-dark rounded-lg px-3 py-1.5 text-sm">
                <span className="font-medium">{r.exercise.name}</span> —{" "}
                {formatValue(r.record_kg, unitForCategory(r.exercise.category))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
        {(["fort", "faible", "a_travailler"] as const).map((type) => (
          <div key={type}>
            <h3 className="text-sm font-semibold text-gray-700 mb-1.5">{tagTitles[type]}</h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.filter((t) => t.type === type).length === 0 && <span className="text-xs text-gray-400">—</span>}
              {tags
                .filter((t) => t.type === type)
                .map((t) => (
                  <span key={t.id} className={`text-xs font-medium rounded-full px-2 py-1 ${tagStyles[type]}`}>
                    {t.label}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">Mes performances</h2>
          {exercises.length > 0 && (
            <button
              onClick={() => setAddPerfOpen(true)}
              className="text-sm bg-toec-green hover:bg-toec-green-dark text-white rounded-lg px-3 py-1.5 font-medium"
            >
              + Ajouter
            </button>
          )}
        </div>
        {exercises.length === 0 ? (
          <p className="text-sm text-gray-400">
            Ton coach n'a pas encore activé d'exercice à suivre comme record.
          </p>
        ) : (
          <>
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
            >
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
            {selectedRecord && (
              <p className="text-sm text-toec-green-dark font-medium mb-2">
                Record actuel : {formatValue(selectedRecord.record_kg, selectedUnit)}
              </p>
            )}
            <PerfChart points={perfPoints} unit={selectedUnit} />
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Mes séances</h2>
        <p className="text-xs text-gray-400 -mt-1 mb-2">Les 7 derniers jours et les séances à venir.</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune séance sur cette période.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((s) => {
              const isOpen = expandedId === s.id;
              const blocks = detailsCache[s.id];
              return (
                <div key={s.id} className="border-l-4 rounded-lg bg-gray-50 overflow-hidden" style={{ borderColor: s.group?.color ?? "#9ca3af" }}>
                  <button onClick={() => toggleExpand(s.id)} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{s.name}</div>
                      <div className="text-xs text-gray-400">
                        {s.date && formatFRDate(s.date)} · {slotLabels[s.time_slot ?? "matin"]}
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
                          <div className="text-xs font-semibold text-toec-green-dark mb-2 uppercase tracking-wide">
                            Ce que j'ai fait
                          </div>
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
          </div>
        )}
      </div>

      {addPerfOpen && exercises.length > 0 && (
        <AddPerfModal
          athleteId={athleteId}
          exercises={exercises}
          onClose={() => setAddPerfOpen(false)}
          onSaved={() => {
            setAddPerfOpen(false);
            loadAll();
          }}
        />
      )}

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
            loadAll();
            loadMyLog(sessionId);
            if (selectedExerciseId) {
              supabase
                .from("performances")
                .select("id, value_kg, date")
                .eq("athlete_id", athleteId)
                .eq("exercise_id", selectedExerciseId)
                .then(({ data }) => setPerfPoints((data as PerformancePoint[]) ?? []));
            }
          }}
        />
      )}
    </div>
  );
}

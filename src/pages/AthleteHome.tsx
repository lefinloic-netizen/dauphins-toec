import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { calcAge } from "../lib/age";
import { addDays, toISODate } from "../lib/dates";
import { formatValue, unitForCategory } from "../lib/units";
import type { Athlete, Exercise } from "../types/database";
import type { AthleteTagRow, RecordRow, PerformancePoint } from "../types/views";
import PerfChart from "../components/dashboard/PerfChart";
import AddPerfModal from "../components/dashboard/AddPerfModal";
import AthleteSessionList, { type SessionWithWarmup } from "../components/athlete/AthleteSessionList";
import WeightTracker from "../components/athlete/WeightTracker";

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
  const [upcoming, setUpcoming] = useState<SessionWithWarmup[]>([]);
  const [addPerfOpen, setAddPerfOpen] = useState(false);

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
      setUpcoming((sessionsData as unknown as SessionWithWarmup[]) ?? []);
    }
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
  const todayIso = toISODate(new Date());
  const todaySession = upcoming.find((s) => s.date === todayIso);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Bonjour {profile!.first_name} 👋</h1>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {groupBadges.map((g) => (
            <span key={g.id} className="text-xs font-medium text-white rounded-full px-2 py-0.5" style={{ backgroundColor: g.color }}>
              {g.name}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-toec-green text-white rounded-2xl shadow-sm p-5">
        <div className="text-xs font-medium uppercase tracking-wide opacity-80 mb-1">Aujourd'hui</div>
        {todaySession ? (
          <>
            <div className="text-lg font-semibold">{todaySession.name}</div>
            <div className="text-sm opacity-90">
              {todaySession.group?.name ?? "Sans groupe"} · {slotLabels[todaySession.time_slot ?? "matin"]}
              {todaySession.duration_minutes ? ` · ${todaySession.duration_minutes} min` : ""}
            </div>
          </>
        ) : (
          <p className="text-sm opacity-90">Pas de séance prévue aujourd'hui.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/protocole"
          className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center justify-center text-center text-toec-green-dark font-medium hover:bg-toec-green-light transition-colors"
        >
          <span>📋</span>
          <span className="text-sm">Mon protocole</span>
        </Link>
        <Link
          to="/protocoles"
          className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center justify-center text-center text-toec-green-dark font-medium hover:bg-toec-green-light transition-colors"
        >
          <span>🎥</span>
          <span className="text-sm">Échauffements & renfo</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
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

      <WeightTracker athleteId={athleteId} />

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
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">Mes séances récentes</h2>
          <Link to="/mon-historique" className="text-sm text-toec-green-dark hover:underline">
            Tout l'historique →
          </Link>
        </div>
        <p className="text-xs text-gray-400 -mt-1 mb-2">Les 7 derniers jours et les séances à venir.</p>
        <AthleteSessionList athleteId={athleteId} sessions={upcoming} onLogged={loadAll} />
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
    </div>
  );
}

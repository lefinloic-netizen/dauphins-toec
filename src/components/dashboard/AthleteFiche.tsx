import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { calcAge } from "../../lib/age";
import type { AthleteWithProfile, AthleteTagRow, RecordRow, PerformancePoint } from "../../types/views";
import type { Exercise } from "../../types/database";
import PerfChart from "./PerfChart";
import AddPerfModal from "./AddPerfModal";
import QuestionnaireViewer from "./QuestionnaireViewer";

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

export default function AthleteFiche({
  athlete,
  onUpdated,
  onDeleted,
}: {
  athlete: AthleteWithProfile;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [birthDate, setBirthDate] = useState(athlete.birth_date ?? "");
  const [weight, setWeight] = useState(athlete.weight_kg?.toString() ?? "");
  const [height, setHeight] = useState(athlete.height_cm?.toString() ?? "");

  const [tags, setTags] = useState<AthleteTagRow[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [perfPoints, setPerfPoints] = useState<PerformancePoint[]>([]);
  const [addPerfOpen, setAddPerfOpen] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setBirthDate(athlete.birth_date ?? "");
    setWeight(athlete.weight_kg?.toString() ?? "");
    setHeight(athlete.height_cm?.toString() ?? "");
    loadTags();
    loadRecords();
  }, [athlete.id]);

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    if (selectedExerciseId) loadPerformances(selectedExerciseId);
  }, [selectedExerciseId, athlete.id]);

  async function loadTags() {
    const { data } = await supabase
      .from("athlete_tags")
      .select("id, athlete_id, type, label, source")
      .eq("athlete_id", athlete.id);
    setTags((data as AthleteTagRow[]) ?? []);
  }

  async function loadRecords() {
    const { data } = await supabase
      .from("athlete_records")
      .select("exercise_id, record_kg, exercise:exercises(name, category, is_record)")
      .eq("athlete_id", athlete.id);
    const rows = ((data as unknown as RecordRow[]) ?? []).filter((r) => r.exercise?.is_record);
    setRecords(rows);
  }

  async function loadExercises() {
    const { data } = await supabase.from("exercises").select("*").eq("is_record", true).order("name");
    const list = (data as Exercise[]) ?? [];
    setExercises(list);
    if (list.length > 0) setSelectedExerciseId((prev) => prev || list[0].id);
  }

  async function loadPerformances(exerciseId: string) {
    const { data } = await supabase
      .from("performances")
      .select("id, value_kg, date")
      .eq("athlete_id", athlete.id)
      .eq("exercise_id", exerciseId);
    setPerfPoints((data as PerformancePoint[]) ?? []);
  }

  async function saveMetric(field: "birth_date" | "weight_kg" | "height_cm", value: string) {
    if (field === "birth_date") {
      await supabase.from("athletes").update({ birth_date: value || null }).eq("id", athlete.id);
    } else if (field === "weight_kg") {
      await supabase
        .from("athletes")
        .update({ weight_kg: value ? Number(value) : null })
        .eq("id", athlete.id);
    } else {
      await supabase
        .from("athletes")
        .update({ height_cm: value ? Number(value) : null })
        .eq("id", athlete.id);
    }
    onUpdated();
  }

  async function addTag() {
    if (!newTagLabel.trim()) return;
    await supabase.from("athlete_tags").insert({
      athlete_id: athlete.id,
      type: "a_travailler",
      label: newTagLabel.trim(),
      source: "coach",
    });
    setNewTagLabel("");
    loadTags();
  }

  async function removeTag(id: string) {
    await supabase.from("athlete_tags").delete().eq("id", id);
    loadTags();
  }

  async function deleteAthlete() {
    if (
      !confirm(
        `Supprimer définitivement le compte de ${athlete.profile.first_name} ${athlete.profile.last_name} ? Toutes ses données (perfs, tags, questionnaire...) seront perdues. Cette action est irréversible.`,
      )
    )
      return;
    setDeleting(true);
    const { error } = await supabase.functions.invoke("delete-athlete", { body: { athlete_id: athlete.id } });
    setDeleting(false);
    if (error) {
      alert("Erreur lors de la suppression : " + error.message);
      return;
    }
    onDeleted();
  }

  const age = calcAge(birthDate || null);
  const selectedRecord = records.find((r) => r.exercise_id === selectedExerciseId);
  const initials = `${athlete.profile.first_name[0] ?? ""}${athlete.profile.last_name[0] ?? ""}`.toUpperCase();

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-toec-green text-white flex items-center justify-center text-lg font-semibold">
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {athlete.profile.first_name} {athlete.profile.last_name}
            </h2>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {athlete.athlete_groups.map(({ group }) => (
                <span
                  key={group.id}
                  className="text-xs font-medium text-white rounded-full px-2 py-0.5"
                  style={{ backgroundColor: group.color }}
                >
                  {group.name}
                </span>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={deleteAthlete}
          disabled={deleting}
          className="text-xs text-red-500 hover:text-red-700 shrink-0 disabled:opacity-60"
        >
          {deleting ? "Suppression..." : "Supprimer cet athlète"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Date de naissance {age !== null && <span className="text-gray-400">({age} ans)</span>}
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            onBlur={() => saveMetric("birth_date", birthDate)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Poids (kg)</label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onBlur={() => saveMetric("weight_kg", weight)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Taille (cm)</label>
          <input
            type="number"
            step="1"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            onBlur={() => saveMetric("height_cm", height)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Records</h3>
        {records.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun record enregistré.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {records.map((r) => (
              <div key={r.exercise_id} className="bg-toec-green-light text-toec-green-dark rounded-lg px-3 py-1.5 text-sm">
                <span className="font-medium">{r.exercise.name}</span> — {r.record_kg} kg
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {(["fort", "faible", "a_travailler"] as const).map((type) => (
          <div key={type}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{tagTitles[type]}</h3>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags
                .filter((t) => t.type === type)
                .map((t) => (
                  <span
                    key={t.id}
                    className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-1 ${tagStyles[type]}`}
                  >
                    {t.label}
                    <button onClick={() => removeTag(t.id)} className="opacity-60 hover:opacity-100">
                      ×
                    </button>
                  </span>
                ))}
              {tags.filter((t) => t.type === type).length === 0 && (
                <span className="text-xs text-gray-400">—</span>
              )}
            </div>
            {type === "a_travailler" && (
              <div className="flex gap-1">
                <input
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  placeholder="Ajouter..."
                  className="flex-1 min-w-0 rounded-lg border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-toec-green"
                />
                <button
                  onClick={addTag}
                  className="text-xs bg-toec-green text-white rounded-lg px-2 hover:bg-toec-green-dark"
                >
                  +
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <QuestionnaireViewer athleteId={athlete.id} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Suivi des performances</h3>
          {exercises.length > 0 && (
            <button
              onClick={() => setAddPerfOpen(true)}
              className="text-sm bg-toec-green hover:bg-toec-green-dark text-white rounded-lg px-3 py-1.5 font-medium"
            >
              + Ajouter une perf
            </button>
          )}
        </div>
        {exercises.length === 0 ? (
          <p className="text-sm text-gray-400">
            Aucun exercice n'est configuré comme record — active-en depuis la Bibliothèque.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
              >
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
              {selectedRecord && (
                <span className="text-sm text-toec-green-dark font-medium">
                  Record actuel : {selectedRecord.record_kg} kg
                </span>
              )}
            </div>
            <PerfChart points={perfPoints} />
          </>
        )}
      </div>

      {addPerfOpen && (
        <AddPerfModal
          athleteId={athlete.id}
          exercises={exercises}
          onClose={() => setAddPerfOpen(false)}
          onSaved={() => {
            setAddPerfOpen(false);
            loadExercises();
            loadRecords();
            if (selectedExerciseId) loadPerformances(selectedExerciseId);
          }}
        />
      )}
    </div>
  );
}

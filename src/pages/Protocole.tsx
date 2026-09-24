import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import type { AthleteTagRow } from "../types/views";

interface ProtocolExerciseView {
  id: string;
  exercise_name: string;
  zone: string | null;
  sets: string | null;
  reps: string | null;
  charge: string | null;
  recovery: string | null;
  observations: string | null;
}

export default function Protocole() {
  const { profile } = useAuth();
  const athleteId = profile!.id;

  const [weakTags, setWeakTags] = useState<AthleteTagRow[]>([]);
  const [zonesNotes, setZonesNotes] = useState<string | null>(null);
  const [exercisesList, setExercisesList] = useState<ProtocolExerciseView[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasProtocol, setHasProtocol] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: tagsData } = await supabase
        .from("athlete_tags")
        .select("id, athlete_id, type, label, source")
        .eq("athlete_id", athleteId)
        .eq("type", "a_travailler");
      setWeakTags((tagsData as AthleteTagRow[]) ?? []);

      const { data: protocol } = await supabase
        .from("athlete_protocols")
        .select("id, zones_notes, athlete_comment")
        .eq("athlete_id", athleteId)
        .maybeSingle();

      if (protocol) {
        setHasProtocol(true);
        setZonesNotes(protocol.zones_notes);
        setComment(protocol.athlete_comment ?? "");

        const { data: exercisesData } = await supabase
          .from("protocol_exercises")
          .select("id, exercise_name, zone, sets, reps, charge, recovery, observations")
          .eq("protocol_id", protocol.id)
          .order("order_index");
        setExercisesList((exercisesData as ProtocolExerciseView[]) ?? []);
      }

      setLoading(false);
    }
    load();
  }, [athleteId]);

  async function saveComment() {
    setSaving(true);
    setSaved(false);
    await supabase.from("athlete_protocols").update({ athlete_comment: comment || null }).eq("athlete_id", athleteId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Chargement...</div>;
  }

  if (!hasProtocol) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
        Ton coach n'a pas encore mis en place de protocole individuel pour toi.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          {profile!.first_name} {profile!.last_name}
        </h1>
        <p className="text-sm text-gray-500">Mon protocole individuel</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Zones de travail</h2>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {weakTags.length === 0 && <span className="text-sm text-gray-400">—</span>}
          {weakTags.map((t) => (
            <span key={t.id} className="text-xs font-medium rounded-full px-2 py-1 bg-orange-100 text-orange-800">
              {t.label}
            </span>
          ))}
        </div>
        {zonesNotes && <p className="text-sm text-gray-700 whitespace-pre-wrap">{zonesNotes}</p>}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Exercices</h2>
        {exercisesList.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun exercice renseigné pour l'instant.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {exercisesList.map((ex) => (
              <div key={ex.id} className="border border-gray-100 rounded-lg p-3">
                <div className="font-medium text-sm text-gray-800">{ex.exercise_name}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {[
                    ex.zone && `Zone : ${ex.zone}`,
                    ex.sets && `${ex.sets} séries`,
                    ex.reps && `${ex.reps} reps`,
                    ex.charge,
                    ex.recovery && `récup ${ex.recovery}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {ex.observations && <p className="text-sm text-gray-600 mt-1">{ex.observations}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Mon retour</h2>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Ressenti, difficultés, questions pour ton coach..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
        />
        <button
          onClick={saveComment}
          disabled={saving}
          className="mt-2 bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg px-4 py-2 text-sm disabled:opacity-60"
        >
          {saving ? "Enregistrement..." : saved ? "Enregistré ✓" : "Enregistrer mon retour"}
        </button>
      </div>
    </div>
  );
}

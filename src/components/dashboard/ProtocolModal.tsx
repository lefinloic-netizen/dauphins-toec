import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { readLocalStorage, writeLocalStorage, clearLocalStorage } from "../../lib/draftStorage";
import Modal from "../Modal";
import type { AthleteTagRow } from "../../types/views";

interface ExerciseRow {
  id: string;
  exercise_name: string;
  zone: string;
  sets: string;
  reps: string;
  charge: string;
  recovery: string;
  observations: string;
}

interface Draft {
  zonesNotes: string;
  rows: ExerciseRow[];
}

function emptyRow(): ExerciseRow {
  return { id: crypto.randomUUID(), exercise_name: "", zone: "", sets: "", reps: "", charge: "", recovery: "", observations: "" };
}

export default function ProtocolModal({
  athleteId,
  athleteName,
  onClose,
}: {
  athleteId: string;
  athleteName: string;
  onClose: () => void;
}) {
  const draftKey = `toec:protocol-draft:${athleteId}`;

  const [weakTags, setWeakTags] = useState<AthleteTagRow[]>([]);
  const [protocolId, setProtocolId] = useState<string | null>(null);
  const [athleteComment, setAthleteComment] = useState<string | null>(null);
  const [zonesNotes, setZonesNotes] = useState("");
  const [rows, setRows] = useState<ExerciseRow[]>([emptyRow()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
        .select("*")
        .eq("athlete_id", athleteId)
        .maybeSingle();

      let baseZonesNotes = "";
      let baseRows: ExerciseRow[] = [emptyRow()];

      if (protocol) {
        setProtocolId(protocol.id);
        setAthleteComment(protocol.athlete_comment);
        baseZonesNotes = protocol.zones_notes ?? "";

        const { data: exercisesData } = await supabase
          .from("protocol_exercises")
          .select("*")
          .eq("protocol_id", protocol.id)
          .order("order_index");

        if (exercisesData && exercisesData.length > 0) {
          baseRows = exercisesData.map((e) => ({
            id: crypto.randomUUID(),
            exercise_name: e.exercise_name,
            zone: e.zone ?? "",
            sets: e.sets ?? "",
            reps: e.reps ?? "",
            charge: e.charge ?? "",
            recovery: e.recovery ?? "",
            observations: e.observations ?? "",
          }));
        }
      }

      const draft = readLocalStorage<Draft>(draftKey);
      setZonesNotes(draft?.zonesNotes ?? baseZonesNotes);
      setRows(draft?.rows?.length ? draft.rows : baseRows);
      setLoading(false);
    }
    load();
  }, [athleteId]);

  useEffect(() => {
    if (loading) return;
    writeLocalStorage<Draft>(draftKey, { zonesNotes, rows });
  }, [zonesNotes, rows, loading]);

  function updateRow(id: string, patch: Partial<ExerciseRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    let id = protocolId;
    if (!id) {
      const { data, error } = await supabase
        .from("athlete_protocols")
        .insert({ athlete_id: athleteId, zones_notes: zonesNotes || null })
        .select("id")
        .single();
      if (error || !data) {
        setSaving(false);
        setMessage(error?.message ?? "Erreur lors de la création du protocole.");
        return;
      }
      id = data.id;
      setProtocolId(id);
    } else {
      await supabase.from("athlete_protocols").update({ zones_notes: zonesNotes || null }).eq("id", id);
    }

    await supabase.from("protocol_exercises").delete().eq("protocol_id", id);

    const validRows = rows.filter((r) => r.exercise_name.trim());
    if (validRows.length > 0) {
      await supabase.from("protocol_exercises").insert(
        validRows.map((r, i) => ({
          protocol_id: id,
          exercise_name: r.exercise_name.trim(),
          zone: r.zone || null,
          sets: r.sets || null,
          reps: r.reps || null,
          charge: r.charge || null,
          recovery: r.recovery || null,
          observations: r.observations || null,
          order_index: i,
        })),
      );
    }

    setSaving(false);
    clearLocalStorage(draftKey);
    setMessage("Protocole enregistré.");
  }

  return (
    <Modal title={`Protocole individuel — ${athleteName}`} onClose={onClose}>
      <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
        {loading ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zones de travail / contraintes
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {weakTags.length === 0 && (
                  <span className="text-xs text-gray-400">
                    Aucun tag "à travailler" sur la fiche de cet(te) athlète.
                  </span>
                )}
                {weakTags.map((t) => (
                  <span key={t.id} className="text-xs font-medium rounded-full px-2 py-1 bg-orange-100 text-orange-800">
                    {t.label}
                  </span>
                ))}
              </div>
              <textarea
                value={zonesNotes}
                onChange={(e) => setZonesNotes(e.target.value)}
                rows={2}
                placeholder="Précisions, contraintes médicales, retour kiné..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="text-left text-xs text-gray-400">
                    <th className="font-medium pb-1 pr-2">Exercice</th>
                    <th className="font-medium pb-1 pr-2 w-28">Zone ciblée</th>
                    <th className="font-medium pb-1 pr-2 w-16">Séries</th>
                    <th className="font-medium pb-1 pr-2 w-20">Reps</th>
                    <th className="font-medium pb-1 pr-2 w-28">Charge / intensité</th>
                    <th className="font-medium pb-1 pr-2 w-24">Récup</th>
                    <th className="font-medium pb-1 pr-2 w-32">Observations</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="pr-2 pb-2">
                        <input
                          list="exercises-datalist"
                          value={r.exercise_name}
                          onChange={(e) => updateRow(r.id, { exercise_name: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-toec-green"
                        />
                      </td>
                      <td className="pr-2 pb-2">
                        <input
                          value={r.zone}
                          onChange={(e) => updateRow(r.id, { zone: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-toec-green"
                        />
                      </td>
                      <td className="pr-2 pb-2">
                        <input
                          value={r.sets}
                          onChange={(e) => updateRow(r.id, { sets: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-toec-green"
                        />
                      </td>
                      <td className="pr-2 pb-2">
                        <input
                          value={r.reps}
                          onChange={(e) => updateRow(r.id, { reps: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-toec-green"
                        />
                      </td>
                      <td className="pr-2 pb-2">
                        <input
                          value={r.charge}
                          onChange={(e) => updateRow(r.id, { charge: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-toec-green"
                        />
                      </td>
                      <td className="pr-2 pb-2">
                        <input
                          value={r.recovery}
                          onChange={(e) => updateRow(r.id, { recovery: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-toec-green"
                        />
                      </td>
                      <td className="pr-2 pb-2">
                        <input
                          value={r.observations}
                          onChange={(e) => updateRow(r.id, { observations: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-toec-green"
                        />
                      </td>
                      <td className="pb-2">
                        <button onClick={() => removeRow(r.id)} className="text-gray-300 hover:text-red-600">
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={addRow} className="self-start text-sm text-toec-green-dark hover:underline">
              + Ajouter un exercice
            </button>

            {athleteComment && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-semibold text-gray-500 mb-1">Retour de l'athlète</div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{athleteComment}</p>
              </div>
            )}

            {message && <p className="text-sm text-toec-green-dark bg-toec-green-light rounded-lg px-3 py-2">{message}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2 disabled:opacity-60"
            >
              {saving ? "Enregistrement..." : "Enregistrer le protocole"}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

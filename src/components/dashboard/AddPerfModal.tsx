import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import Modal from "../Modal";
import type { Exercise } from "../../types/database";

export default function AddPerfModal({
  athleteId,
  exercises,
  onClose,
  onSaved,
}: {
  athleteId: string;
  exercises: Exercise[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const { error: perfError } = await supabase.from("performances").insert({
      athlete_id: athleteId,
      exercise_id: exerciseId,
      value_kg: Number(value),
      date,
    });

    setSaving(false);

    if (perfError) {
      setError(perfError.message);
      return;
    }

    onSaved();
  }

  if (exercises.length === 0) {
    return (
      <Modal title="Ajouter une performance" onClose={onClose}>
        <p className="text-sm text-gray-500">
          Aucun exercice n'est configuré comme record pour l'instant. Le coach doit d'abord en activer un depuis la
          Bibliothèque.
        </p>
      </Modal>
    );
  }

  return (
    <Modal title="Ajouter une performance" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exercice</label>
          <select
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valeur (kg)</label>
            <input
              type="number"
              step="0.5"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2 transition-colors disabled:opacity-60"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </Modal>
  );
}

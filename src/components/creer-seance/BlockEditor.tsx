export interface ExerciseDraft {
  id: string;
  exercise_name: string;
  sets: string;
  reps: string;
  charge_rpe: string;
  tempo: string;
  recovery: string;
}

export interface BlockDraft {
  id: string;
  title: string;
  exercises: ExerciseDraft[];
}

export default function BlockEditor({
  block,
  onChange,
  onDelete,
}: {
  block: BlockDraft;
  onChange: (block: BlockDraft) => void;
  onDelete: () => void;
}) {
  function updateExercise(id: string, patch: Partial<ExerciseDraft>) {
    onChange({
      ...block,
      exercises: block.exercises.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)),
    });
  }

  function addExercise() {
    onChange({
      ...block,
      exercises: [
        ...block.exercises,
        { id: crypto.randomUUID(), exercise_name: "", sets: "", reps: "", charge_rpe: "", tempo: "", recovery: "" },
      ],
    });
  }

  function removeExercise(id: string) {
    onChange({ ...block, exercises: block.exercises.filter((ex) => ex.id !== id) });
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          className="flex-1 font-medium text-gray-800 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
          placeholder="Titre du bloc"
        />
        <button onClick={onDelete} className="text-sm text-red-500 hover:text-red-700 shrink-0">
          Supprimer le bloc
        </button>
      </div>

      {block.exercises.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-gray-400">
                <th className="font-medium pb-1 pr-2">Exercice</th>
                <th className="font-medium pb-1 pr-2 w-16">Séries</th>
                <th className="font-medium pb-1 pr-2 w-16">Reps</th>
                <th className="font-medium pb-1 pr-2 w-32">Charge / RPE</th>
                <th className="font-medium pb-1 pr-2 w-24">Tempo</th>
                <th className="font-medium pb-1 pr-2 w-28">Récup</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {block.exercises.map((ex) => (
                <tr key={ex.id}>
                  <td className="pr-2 pb-2">
                    <input
                      list="exercises-datalist"
                      value={ex.exercise_name}
                      onChange={(e) => updateExercise(ex.id, { exercise_name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-toec-green"
                    />
                  </td>
                  <td className="pr-2 pb-2">
                    <input
                      value={ex.sets}
                      onChange={(e) => updateExercise(ex.id, { sets: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-toec-green"
                    />
                  </td>
                  <td className="pr-2 pb-2">
                    <input
                      value={ex.reps}
                      onChange={(e) => updateExercise(ex.id, { reps: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-toec-green"
                    />
                  </td>
                  <td className="pr-2 pb-2">
                    <input
                      value={ex.charge_rpe}
                      onChange={(e) => updateExercise(ex.id, { charge_rpe: e.target.value })}
                      placeholder="80% 1RM, RPE 8..."
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-toec-green"
                    />
                  </td>
                  <td className="pr-2 pb-2">
                    <input
                      value={ex.tempo}
                      onChange={(e) => updateExercise(ex.id, { tempo: e.target.value })}
                      placeholder="3-1-1-0"
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-toec-green"
                    />
                  </td>
                  <td className="pr-2 pb-2">
                    <input
                      value={ex.recovery}
                      onChange={(e) => updateExercise(ex.id, { recovery: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-toec-green"
                    />
                  </td>
                  <td className="pb-2">
                    <button onClick={() => removeExercise(ex.id)} className="text-gray-300 hover:text-red-600">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={addExercise} className="text-sm text-toec-green-dark hover:underline text-left">
        + Ajouter un exercice
      </button>
    </div>
  );
}

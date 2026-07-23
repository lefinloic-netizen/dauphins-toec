import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Exercise, ExerciseCategory } from "../types/database";
import Modal from "../components/Modal";

const categoryLabels: Record<ExerciseCategory, string> = {
  musculation: "Musculation",
  mobilite: "Mobilité",
  filler: "Filler",
  renfo: "Renfo",
  cardio: "Cardio",
  natation: "Natation",
};

const categoryClasses: Record<ExerciseCategory, string> = {
  musculation: "bg-cat-muscu-bg text-cat-muscu-text",
  mobilite: "bg-cat-mobilite-bg text-cat-mobilite-text",
  filler: "bg-cat-filler-bg text-cat-filler-text",
  renfo: "bg-cat-renfo-bg text-cat-renfo-text",
  cardio: "bg-cat-cardio-bg text-cat-cardio-text",
  natation: "bg-cat-natation-bg text-cat-natation-text",
};

export default function Bibliotheque() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<ExerciseCategory>("musculation");
  const [newIsRecord, setNewIsRecord] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<ExerciseCategory>("musculation");
  const [editIsRecord, setEditIsRecord] = useState(false);

  async function loadExercises() {
    const { data } = await supabase.from("exercises").select("*").order("name");
    setExercises((data as Exercise[]) ?? []);
  }

  useEffect(() => {
    loadExercises();
  }, []);

  const filtered = exercises.filter((ex) => {
    const matchesCategory = categoryFilter === "all" || ex.category === categoryFilter;
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  async function addExercise() {
    if (!newName.trim()) return;
    await supabase.from("exercises").insert({ name: newName.trim(), category: newCategory, is_record: newIsRecord });
    setNewName("");
    setNewIsRecord(false);
    setAddOpen(false);
    loadExercises();
  }

  async function deleteExercise(ex: Exercise) {
    if (!confirm(`Supprimer l'exercice "${ex.name}" ?`)) return;
    await supabase.from("exercises").delete().eq("id", ex.id);
    loadExercises();
  }

  function openEditExercise(ex: Exercise) {
    setEditingExercise(ex);
    setEditName(ex.name);
    setEditCategory(ex.category);
    setEditIsRecord(ex.is_record);
  }

  async function saveExerciseEdit() {
    if (!editingExercise || !editName.trim()) return;
    await supabase
      .from("exercises")
      .update({ name: editName.trim(), category: editCategory, is_record: editIsRecord })
      .eq("id", editingExercise.id);
    setEditingExercise(null);
    loadExercises();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-semibold text-gray-900 text-lg">Bibliothèque d'exercices</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="text-sm bg-toec-green hover:bg-toec-green-dark text-white rounded-lg px-3 py-2 font-medium"
        >
          + Ajouter un exercice
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap items-center gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un exercice..."
          className="flex-1 min-w-[180px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ExerciseCategory | "all")}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
        >
          <option value="all">Toutes les catégories</option>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((ex) => (
          <div key={ex.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between gap-2">
            <button onClick={() => openEditExercise(ex)} className="min-w-0 text-left hover:opacity-80">
              <div className="font-medium text-gray-900 truncate">{ex.name}</div>
              <div className="flex flex-wrap items-center gap-1 mt-1">
                <span className={`inline-block text-xs font-medium rounded-full px-2 py-0.5 ${categoryClasses[ex.category]}`}>
                  {categoryLabels[ex.category]}
                </span>
                {ex.is_record && (
                  <span className="inline-block text-xs font-medium rounded-full px-2 py-0.5 bg-toec-green-light text-toec-green-dark">
                    Record suivi
                  </span>
                )}
              </div>
            </button>
            <button onClick={() => deleteExercise(ex)} className="text-gray-300 hover:text-red-600 shrink-0" aria-label="Supprimer">
              ✕
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 mt-4">Aucun exercice trouvé.</div>
      )}

      {addOpen && (
        <Modal title="Ajouter un exercice" onClose={() => setAddOpen(false)}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ExerciseCategory)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={newIsRecord} onChange={(e) => setNewIsRecord(e.target.checked)} />
              Suivre comme record (apparaît sur les fiches athlètes)
            </label>
            <button onClick={addExercise} className="bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2">
              Ajouter
            </button>
          </div>
        </Modal>
      )}

      {editingExercise && (
        <Modal title="Modifier l'exercice" onClose={() => setEditingExercise(null)}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as ExerciseCategory)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={editIsRecord} onChange={(e) => setEditIsRecord(e.target.checked)} />
              Suivre comme record (apparaît sur les fiches athlètes)
            </label>
            <button onClick={saveExerciseEdit} className="bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2">
              Enregistrer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

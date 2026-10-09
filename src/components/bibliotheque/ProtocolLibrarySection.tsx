import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Modal from "../Modal";
import type { ProtocolLibraryCategory, ProtocolLibraryItem } from "../../types/database";

const categoryLabels: Record<ProtocolLibraryCategory, string> = {
  echauffement: "Échauffement",
  mobilite: "Mobilité",
  renfo: "Renfo",
};

const categoryClasses: Record<ProtocolLibraryCategory, string> = {
  echauffement: "bg-cat-cardio-bg text-cat-cardio-text",
  mobilite: "bg-cat-mobilite-bg text-cat-mobilite-text",
  renfo: "bg-cat-renfo-bg text-cat-renfo-text",
};

interface FormState {
  title: string;
  category: ProtocolLibraryCategory;
  zone: string;
  description: string;
  video_url: string;
}

function emptyForm(): FormState {
  return { title: "", category: "echauffement", zone: "", description: "", video_url: "" };
}

export default function ProtocolLibrarySection() {
  const [items, setItems] = useState<ProtocolLibraryItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProtocolLibraryCategory | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingItem, setEditingItem] = useState<ProtocolLibraryItem | null>(null);

  async function load() {
    const { data } = await supabase.from("protocol_library").select("*").order("order_index").order("title");
    setItems((data as ProtocolLibraryItem[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((it) => {
    const matchesCategory = categoryFilter === "all" || it.category === categoryFilter;
    const matchesSearch =
      it.title.toLowerCase().includes(search.toLowerCase()) || (it.zone ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  async function addItem() {
    if (!form.title.trim()) return;
    await supabase.from("protocol_library").insert({
      title: form.title.trim(),
      category: form.category,
      zone: form.zone || null,
      description: form.description || null,
      video_url: form.video_url || null,
    });
    setForm(emptyForm());
    setAddOpen(false);
    load();
  }

  async function deleteItem(item: ProtocolLibraryItem) {
    if (!confirm(`Supprimer la fiche "${item.title}" ?`)) return;
    await supabase.from("protocol_library").delete().eq("id", item.id);
    load();
  }

  function openEdit(item: ProtocolLibraryItem) {
    setEditingItem(item);
    setForm({
      title: item.title,
      category: item.category,
      zone: item.zone ?? "",
      description: item.description ?? "",
      video_url: item.video_url ?? "",
    });
  }

  async function saveEdit() {
    if (!editingItem || !form.title.trim()) return;
    await supabase
      .from("protocol_library")
      .update({
        title: form.title.trim(),
        category: form.category,
        zone: form.zone || null,
        description: form.description || null,
        video_url: form.video_url || null,
      })
      .eq("id", editingItem.id);
    setEditingItem(null);
    load();
  }

  function renderForm() {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Échauffement type 1, Mobilité épaule..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ProtocolLibraryCategory }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
            >
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone du corps</label>
            <input
              value={form.zone}
              onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
              placeholder="Épaule, hanches..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lien vidéo (YouTube, Vimeo...)</label>
          <input
            value={form.video_url}
            onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
            placeholder="https://..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description / consignes</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-semibold text-gray-900 text-lg">Bibliothèque de protocoles</h2>
        <button
          onClick={() => {
            setForm(emptyForm());
            setAddOpen(true);
          }}
          className="text-sm bg-toec-green hover:bg-toec-green-dark text-white rounded-lg px-3 py-2 font-medium"
        >
          + Ajouter une fiche
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap items-center gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un titre ou une zone..."
          className="flex-1 min-w-[180px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ProtocolLibraryCategory | "all")}
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
        {filtered.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-start justify-between gap-2">
            <button onClick={() => openEdit(item)} className="min-w-0 text-left hover:opacity-80">
              <div className="font-medium text-gray-900 truncate">{item.title}</div>
              <div className="flex flex-wrap items-center gap-1 mt-1">
                <span className={`inline-block text-xs font-medium rounded-full px-2 py-0.5 ${categoryClasses[item.category]}`}>
                  {categoryLabels[item.category]}
                </span>
                {item.zone && <span className="text-xs text-gray-400">{item.zone}</span>}
              </div>
              {item.video_url && <p className="text-xs text-toec-green-dark mt-1">🎥 Vidéo liée</p>}
            </button>
            <button onClick={() => deleteItem(item)} className="text-gray-300 hover:text-red-600 shrink-0" aria-label="Supprimer">
              ✕
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 mt-4">Aucune fiche trouvée.</div>
      )}

      {addOpen && (
        <Modal title="Ajouter une fiche" onClose={() => setAddOpen(false)}>
          <div className="flex flex-col gap-4">
            {renderForm()}
            <button onClick={addItem} className="bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2">
              Ajouter
            </button>
          </div>
        </Modal>
      )}

      {editingItem && (
        <Modal title="Modifier la fiche" onClose={() => setEditingItem(null)}>
          <div className="flex flex-col gap-4">
            {renderForm()}
            <button onClick={saveEdit} className="bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2">
              Enregistrer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Modal from "../Modal";

interface TemplateRow {
  id: string;
  name: string;
}

export default function ManageTemplatesModal({
  templates,
  onClose,
  onChanged,
}: {
  templates: TemplateRow[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function startEdit(t: TemplateRow) {
    setEditingId(t.id);
    setEditingName(t.name);
  }

  async function saveRename() {
    if (!editingId || !editingName.trim()) return;
    await supabase.from("sessions").update({ name: editingName.trim() }).eq("id", editingId);
    setEditingId(null);
    onChanged();
  }

  async function deleteTemplate(t: TemplateRow) {
    if (!confirm(`Supprimer le template "${t.name}" ? Cette action est irréversible.`)) return;
    await supabase.from("sessions").delete().eq("id", t.id);
    onChanged();
  }

  return (
    <Modal title="Gérer les templates" onClose={onClose}>
      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
        {templates.length === 0 && <p className="text-sm text-gray-400">Aucun template enregistré.</p>}
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            {editingId === t.id ? (
              <>
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveRename()}
                  className="flex-1 min-w-0 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
                />
                <button onClick={saveRename} className="text-sm text-toec-green-dark hover:underline shrink-0">
                  Enregistrer
                </button>
                <button onClick={() => setEditingId(null)} className="text-sm text-gray-400 hover:underline shrink-0">
                  Annuler
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 min-w-0 text-sm text-gray-800 truncate">{t.name}</span>
                <button onClick={() => startEdit(t)} className="text-sm text-toec-green-dark hover:underline shrink-0">
                  Renommer
                </button>
                <button onClick={() => deleteTemplate(t)} className="text-sm text-red-500 hover:text-red-700 shrink-0">
                  Supprimer
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

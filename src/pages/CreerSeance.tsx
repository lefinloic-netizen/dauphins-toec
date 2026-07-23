import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { Exercise, Group, TimeSlot } from "../types/database";
import BlockEditor, { type BlockDraft } from "../components/creer-seance/BlockEditor";

const timeSlotLabels: Record<TimeSlot, string> = { matin: "Matin", apres_midi: "Après-midi", soir: "Soir" };

function emptyBlock(): BlockDraft {
  return { id: crypto.randomUUID(), title: "Bloc", exercises: [] };
}

export default function CreerSeance() {
  const location = useLocation();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<Group[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [groupId, setGroupId] = useState("");
  const [duration, setDuration] = useState("");
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("matin");
  const [warmupText, setWarmupText] = useState("");
  const [blocks, setBlocks] = useState<BlockDraft[]>([emptyBlock()]);

  const [templateToLoad, setTemplateToLoad] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadGroups() {
    const { data } = await supabase.from("groups").select("*").order("name");
    setGroups((data as Group[]) ?? []);
  }

  async function loadExercises() {
    const { data } = await supabase.from("exercises").select("*").order("name");
    setExercises((data as Exercise[]) ?? []);
  }

  async function loadTemplatesList() {
    const { data } = await supabase.from("sessions").select("id, name").eq("is_template", true).order("name");
    setTemplates((data as { id: string; name: string }[]) ?? []);
  }

  useEffect(() => {
    loadGroups();
    loadExercises();
    loadTemplatesList();
  }, []);

  useEffect(() => {
    const state = location.state as { editSessionId?: string; duplicateSessionId?: string } | null;
    if (state?.editSessionId) {
      loadForEdit(state.editSessionId);
      navigate(location.pathname, { replace: true, state: null });
    } else if (state?.duplicateSessionId) {
      loadForDuplicate(state.duplicateSessionId);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state]);

  function resetForm() {
    setName("");
    setDate("");
    setGroupId("");
    setDuration("");
    setTimeSlot("matin");
    setWarmupText("");
    setBlocks([emptyBlock()]);
    setTemplateToLoad("");
    setEditingSessionId(null);
    setEditingSessionName("");
  }

  function addBlock() {
    setBlocks((b) => [...b, emptyBlock()]);
  }

  function updateBlock(id: string, updated: BlockDraft) {
    setBlocks((b) => b.map((block) => (block.id === id ? updated : block)));
  }

  function deleteBlock(id: string) {
    setBlocks((b) => b.filter((block) => block.id !== id));
  }

  async function fetchSessionDraft(id: string) {
    const { data: session } = await supabase.from("sessions").select("*").eq("id", id).single();
    if (!session) return null;
    const { data: blocksData } = await supabase
      .from("session_blocks")
      .select("*")
      .eq("session_id", id)
      .order("order_index");

    const blockDrafts: BlockDraft[] = [];
    for (const b of blocksData ?? []) {
      const { data: exData } = await supabase
        .from("session_exercises")
        .select("*")
        .eq("block_id", b.id)
        .order("order_index");
      blockDrafts.push({
        id: crypto.randomUUID(),
        title: b.title,
        exercises: (exData ?? []).map((e) => ({
          id: crypto.randomUUID(),
          exercise_name: e.exercise_name,
          sets: e.sets ?? "",
          reps: e.reps ?? "",
          charge_rpe: e.charge_rpe ?? "",
          recovery: e.recovery ?? "",
        })),
      });
    }

    return { session, blockDrafts };
  }

  function applyDraftToForm(session: { name: string; group_id: string | null; duration_minutes: number | null; warmup_text: string | null; time_slot: TimeSlot | null }, blockDrafts: BlockDraft[]) {
    setName(session.name);
    setGroupId(session.group_id ?? "");
    setDuration(session.duration_minutes?.toString() ?? "");
    setWarmupText(session.warmup_text ?? "");
    setTimeSlot(session.time_slot ?? "matin");
    setBlocks(blockDrafts.length > 0 ? blockDrafts : [emptyBlock()]);
  }

  async function loadTemplate(id: string) {
    setTemplateToLoad(id);
    if (!id) return;
    const draft = await fetchSessionDraft(id);
    if (!draft) return;
    applyDraftToForm(draft.session, draft.blockDrafts);
    setDate("");
    setEditingSessionId(null);
    setEditingSessionName("");
    setMessage(`Template "${draft.session.name}" chargé — choisis une date pour l'assigner au calendrier.`);
  }

  async function loadForEdit(id: string) {
    const draft = await fetchSessionDraft(id);
    if (!draft) return;
    applyDraftToForm(draft.session, draft.blockDrafts);
    setDate(draft.session.date ?? "");
    setEditingSessionId(id);
    setEditingSessionName(draft.session.name);
    setTemplateToLoad("");
    setMessage(null);
  }

  async function loadForDuplicate(id: string) {
    const draft = await fetchSessionDraft(id);
    if (!draft) return;
    applyDraftToForm(draft.session, draft.blockDrafts);
    setDate(draft.session.date ?? "");
    setEditingSessionId(null);
    setEditingSessionName("");
    setTemplateToLoad("");
    setMessage(`Séance dupliquée à partir de "${draft.session.name}" — ajuste la date si besoin puis enregistre.`);
  }

  async function saveSession(asTemplate: boolean) {
    setMessage(null);
    if (!name.trim()) {
      setMessage("Le nom de la séance est requis.");
      return;
    }
    if (!asTemplate && (!date || !groupId)) {
      setMessage("Date et groupe sont requis pour enregistrer une séance dans le calendrier.");
      return;
    }

    setSaving(true);

    const isEditing = !!editingSessionId && !asTemplate;

    const payload = {
      name: name.trim(),
      date: asTemplate ? null : date,
      group_id: groupId || null,
      duration_minutes: duration ? Number(duration) : null,
      warmup_text: warmupText || null,
      time_slot: timeSlot,
      is_template: asTemplate,
    };

    let sessionId: string;

    if (isEditing) {
      const { error } = await supabase.from("sessions").update(payload).eq("id", editingSessionId);
      if (error) {
        setSaving(false);
        setMessage(error.message);
        return;
      }
      sessionId = editingSessionId as string;
      // repartir sur des blocs propres : on supprime les anciens (cascade sur les exercices) puis on réinsère
      await supabase.from("session_blocks").delete().eq("session_id", sessionId);
    } else {
      const { data: sessionRow, error } = await supabase.from("sessions").insert(payload).select("id").single();
      if (error || !sessionRow) {
        setSaving(false);
        setMessage(error?.message ?? "Erreur lors de l'enregistrement.");
        return;
      }
      sessionId = sessionRow.id;
    }

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const { data: blockRow } = await supabase
        .from("session_blocks")
        .insert({ session_id: sessionId, title: block.title || "Bloc", order_index: i })
        .select("id")
        .single();
      if (!blockRow) continue;

      for (let j = 0; j < block.exercises.length; j++) {
        const ex = block.exercises[j];
        if (!ex.exercise_name.trim()) continue;
        const matched = exercises.find((e) => e.name.toLowerCase() === ex.exercise_name.trim().toLowerCase());
        await supabase.from("session_exercises").insert({
          block_id: blockRow.id,
          exercise_name: ex.exercise_name.trim(),
          exercise_id: matched?.id ?? null,
          sets: ex.sets || null,
          reps: ex.reps || null,
          charge_rpe: ex.charge_rpe || null,
          recovery: ex.recovery || null,
          order_index: j,
        });
      }
    }

    setSaving(false);
    setMessage(asTemplate ? "Template enregistré." : isEditing ? "Séance modifiée." : "Séance enregistrée — visible dans Programmation.");
    resetForm();
    loadTemplatesList();
  }

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-lg">Créer une séance</h2>
        <Link to="/historique" className="text-sm text-toec-green-dark hover:underline">
          Voir l'historique des séances →
        </Link>
      </div>

      {editingSessionId && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span>Modification de la séance "{editingSessionName}"</span>
          <button onClick={resetForm} className="text-amber-800 hover:underline font-medium">
            Annuler / nouvelle séance
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <select
            value={templateToLoad}
            onChange={(e) => loadTemplate(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
          >
            <option value="">Charger un template existant...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la séance</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Groupe</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
            >
              <option value="">—</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durée (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moment</label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value as TimeSlot)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
              >
                {Object.entries(timeSlotLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Échauffement (consignes en autonomie)</label>
          <textarea
            value={warmupText}
            onChange={(e) => setWarmupText(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
          />
        </div>
      </div>

      <datalist id="exercises-datalist">
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.name} />
        ))}
      </datalist>

      <div className="flex flex-col gap-3">
        {blocks.map((block) => (
          <BlockEditor
            key={block.id}
            block={block}
            onChange={(updated) => updateBlock(block.id, updated)}
            onDelete={() => deleteBlock(block.id)}
          />
        ))}
        <button
          onClick={addBlock}
          className="self-start text-sm bg-white border border-toec-green text-toec-green-dark hover:bg-toec-green-light rounded-lg px-3 py-2 font-medium"
        >
          + Ajouter un bloc
        </button>
      </div>

      {message && <p className="text-sm text-toec-green-dark bg-toec-green-light rounded-lg px-3 py-2">{message}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={() => saveSession(false)}
          disabled={saving}
          className="bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg px-4 py-2 disabled:opacity-60"
        >
          {saving ? "Enregistrement..." : editingSessionId ? "Enregistrer les modifications" : "Enregistrer la séance"}
        </button>
        <button
          onClick={() => saveSession(true)}
          disabled={saving}
          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg px-4 py-2 disabled:opacity-60"
        >
          Sauvegarder comme template
        </button>
      </div>
    </div>
  );
}

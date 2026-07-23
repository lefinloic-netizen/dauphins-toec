import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { nextGroupColor, GROUP_COLOR_PALETTE } from "../lib/groupColors";
import type { Group } from "../types/database";
import type { AthleteWithProfile } from "../types/views";
import Modal from "../components/Modal";

export default function Groupes() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [athletes, setAthletes] = useState<AthleteWithProfile[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [addMemberGroupId, setAddMemberGroupId] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<{ athleteId: string; fromGroupId: string } | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  async function loadGroups() {
    const { data } = await supabase.from("groups").select("*").order("created_at");
    setGroups((data as Group[]) ?? []);
  }

  async function loadAthletes() {
    const { data } = await supabase
      .from("athletes")
      .select(
        `id, sex, birth_date, weight_kg, height_cm, category,
         profile:profiles(first_name, last_name, email),
         athlete_groups(group:groups(id, name, color))`,
      );
    setAthletes((data as unknown as AthleteWithProfile[]) ?? []);
  }

  useEffect(() => {
    loadGroups();
    loadAthletes();
  }, []);

  function membersOfGroup(groupId: string) {
    return athletes.filter((a) => a.athlete_groups.some((ag) => ag.group.id === groupId));
  }

  function availableForGroup(groupId: string) {
    return athletes.filter((a) => !a.athlete_groups.some((ag) => ag.group.id === groupId));
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    await supabase.from("groups").insert({ name: newGroupName.trim(), color: nextGroupColor(groups.length) });
    setNewGroupName("");
    setCreateOpen(false);
    loadGroups();
  }

  function openEditGroup(group: Group) {
    setEditingGroup(group);
    setEditName(group.name);
    setEditColor(group.color);
  }

  async function saveGroupEdit() {
    if (!editingGroup || !editName.trim()) return;
    await supabase.from("groups").update({ name: editName.trim(), color: editColor }).eq("id", editingGroup.id);
    setEditingGroup(null);
    loadGroups();
    loadAthletes();
  }

  async function deleteGroup(group: Group) {
    if (!confirm(`Supprimer le groupe "${group.name}" ? Les séances liées perdront leur groupe.`)) return;
    await supabase.from("groups").delete().eq("id", group.id);
    loadGroups();
    loadAthletes();
  }

  async function addMember(groupId: string, athleteId: string) {
    await supabase.from("athlete_groups").insert({ athlete_id: athleteId, group_id: groupId });
    setAddMemberGroupId(null);
    loadAthletes();
  }

  async function removeMember(groupId: string, athleteId: string) {
    await supabase.from("athlete_groups").delete().eq("athlete_id", athleteId).eq("group_id", groupId);
    loadAthletes();
  }

  async function transferMember(athleteId: string, fromGroupId: string, toGroupId: string) {
    await supabase.from("athlete_groups").delete().eq("athlete_id", athleteId).eq("group_id", fromGroupId);
    await supabase.from("athlete_groups").insert({ athlete_id: athleteId, group_id: toGroupId });
    setTransferTarget(null);
    loadAthletes();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 text-lg">Groupes</h2>
        <button
          onClick={() => setCreateOpen(true)}
          className="text-sm bg-toec-green hover:bg-toec-green-dark text-white rounded-lg px-3 py-2 font-medium"
        >
          + Créer un groupe
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {groups.map((group) => {
          const members = membersOfGroup(group.id);
          return (
            <div key={group.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="h-2" style={{ backgroundColor: group.color }} />
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{group.name}</h3>
                    <p className="text-xs text-gray-400">
                      {members.length} membre{members.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => openEditGroup(group)} className="text-xs text-toec-green-dark hover:underline">
                      Modifier
                    </button>
                    <button onClick={() => deleteGroup(group)} className="text-xs text-red-500 hover:text-red-700">
                      Supprimer
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                  {members.length === 0 && <p className="text-sm text-gray-400">Aucun membre.</p>}
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-sm text-gray-700 truncate">
                        {m.profile.first_name} {m.profile.last_name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          title="Transférer vers un autre groupe"
                          onClick={() => setTransferTarget({ athleteId: m.id, fromGroupId: group.id })}
                          className="text-gray-400 hover:text-toec-green-dark text-sm"
                        >
                          ⇄
                        </button>
                        <button
                          title="Retirer du groupe"
                          onClick={() => removeMember(group.id, m.id)}
                          className="text-gray-400 hover:text-red-600 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setAddMemberGroupId(group.id)}
                  className="text-sm text-toec-green-dark hover:underline text-left"
                >
                  + Ajouter un athlète
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {groups.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 mt-4">
          Aucun groupe pour l'instant.
        </div>
      )}

      {createOpen && (
        <Modal title="Créer un groupe" onClose={() => setCreateOpen(false)}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du groupe</label>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createGroup()}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
              />
            </div>
            <button
              onClick={createGroup}
              className="bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2"
            >
              Créer
            </button>
          </div>
        </Modal>
      )}

      {addMemberGroupId && (
        <Modal title="Ajouter un athlète" onClose={() => setAddMemberGroupId(null)}>
          <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
            {availableForGroup(addMemberGroupId).length === 0 && (
              <p className="text-sm text-gray-400">Tous les athlètes sont déjà dans ce groupe.</p>
            )}
            {availableForGroup(addMemberGroupId).map((a) => (
              <button
                key={a.id}
                onClick={() => addMember(addMemberGroupId, a.id)}
                className="text-left text-sm px-3 py-2 rounded-lg hover:bg-toec-green-light"
              >
                {a.profile.first_name} {a.profile.last_name}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {editingGroup && (
        <Modal title="Modifier le groupe" onClose={() => setEditingGroup(null)}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du groupe</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveGroupEdit()}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
              <div className="flex gap-2">
                {GROUP_COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${editColor === color ? "border-gray-800" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={saveGroupEdit}
              className="bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2"
            >
              Enregistrer
            </button>
          </div>
        </Modal>
      )}

      {transferTarget && (
        <Modal title="Transférer vers un autre groupe" onClose={() => setTransferTarget(null)}>
          <div className="flex flex-col gap-1.5">
            {groups
              .filter((g) => g.id !== transferTarget.fromGroupId)
              .map((g) => (
                <button
                  key={g.id}
                  onClick={() => transferMember(transferTarget.athleteId, transferTarget.fromGroupId, g.id)}
                  className="text-left text-sm px-3 py-2 rounded-lg hover:bg-toec-green-light flex items-center gap-2"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name}
                </button>
              ))}
            {groups.length <= 1 && <p className="text-sm text-gray-400">Aucun autre groupe disponible.</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

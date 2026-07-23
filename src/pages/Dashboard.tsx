import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { calcAge } from "../lib/age";
import type { AthleteWithProfile } from "../types/views";
import AthleteFiche from "../components/dashboard/AthleteFiche";
import InviteAthleteModal from "../components/dashboard/InviteAthleteModal";

export default function Dashboard() {
  const [athletes, setAthletes] = useState<AthleteWithProfile[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadAthletes() {
    setLoading(true);
    const { data } = await supabase
      .from("athletes")
      .select(
        `id, sex, birth_date, weight_kg, height_cm, category,
         profile:profiles(first_name, last_name, email),
         athlete_groups(group:groups(id, name, color))`,
      );
    const rows = ((data as unknown as AthleteWithProfile[]) ?? []).sort((a, b) =>
      a.profile.last_name.localeCompare(b.profile.last_name),
    );
    setAthletes(rows);
    setLoading(false);
  }

  useEffect(() => {
    loadAthletes();
  }, []);

  const filtered = athletes.filter((a) => {
    const full = `${a.profile.first_name} ${a.profile.last_name}`.toLowerCase();
    return full.includes(search.toLowerCase());
  });

  const selected = athletes.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start">
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Effectif</h2>
          <span className="text-sm text-gray-400">{athletes.length} athlète{athletes.length > 1 ? "s" : ""}</span>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
        />
        <button
          onClick={() => setInviteOpen(true)}
          className="w-full text-sm bg-toec-green hover:bg-toec-green-dark text-white rounded-lg py-2 font-medium"
        >
          + Inviter un(e) athlète
        </button>

        <div className="flex flex-col gap-1 max-h-[65vh] overflow-y-auto">
          {loading && <p className="text-sm text-gray-400 py-4 text-center">Chargement...</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">Aucun athlète.</p>
          )}
          {filtered.map((a) => {
            const initials = `${a.profile.first_name[0] ?? ""}${a.profile.last_name[0] ?? ""}`.toUpperCase();
            const age = calcAge(a.birth_date);
            return (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                  selectedId === a.id ? "bg-toec-green-light" : "hover:bg-gray-50"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-toec-green text-white flex items-center justify-center text-sm font-semibold shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {a.profile.first_name} {a.profile.last_name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {a.sex ?? "—"} · {age !== null ? `${age} ans` : "âge ?"} {a.category ? `· ${a.category}` : ""}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <AthleteFiche
          athlete={selected}
          onUpdated={loadAthletes}
          onDeleted={() => {
            setSelectedId(null);
            loadAthletes();
          }}
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
          Sélectionne un athlète dans la liste pour voir sa fiche.
        </div>
      )}

      {inviteOpen && (
        <InviteAthleteModal
          onClose={() => setInviteOpen(false)}
          onInvited={() => {
            setInviteOpen(false);
            loadAthletes();
          }}
        />
      )}
    </div>
  );
}

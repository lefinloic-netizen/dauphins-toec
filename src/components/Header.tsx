import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import type { NextCompetition } from "../types/database";
import Modal from "./Modal";

const todayLabel = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function Header() {
  const [competition, setCompetition] = useState<NextCompetition | null>(null);
  const [editing, setEditing] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState("");

  async function loadCompetition() {
    const { data } = await supabase
      .from("next_competition")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    setCompetition(data);
  }

  useEffect(() => {
    loadCompetition();
  }, []);

  function openEdit() {
    setFormName(competition?.name ?? "");
    setFormDate(competition?.date ?? "");
    setEditing(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (competition) {
      await supabase
        .from("next_competition")
        .update({ name: formName, date: formDate })
        .eq("id", competition.id);
    } else {
      await supabase.from("next_competition").insert({ name: formName, date: formDate, is_active: true });
    }
    setEditing(false);
    loadCompetition();
  }

  const days = competition ? daysUntil(competition.date) : null;

  return (
    <header className="bg-toec-green text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 font-semibold">
        <span className="text-xl">🐬</span>
        <span>Dauphins du TOEC</span>
      </div>
      <div className="text-sm capitalize opacity-90">{todayLabel}</div>
      <button
        onClick={openEdit}
        className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors rounded-full px-3 py-1.5 text-sm"
      >
        {competition ? (
          <>
            <span className="font-medium">{competition.name}</span>
            <span className="bg-white text-toec-green-dark font-bold rounded-full px-2 py-0.5 text-xs">
              {days !== null && days >= 0 ? `J-${days}` : "passée"}
            </span>
          </>
        ) : (
          <span>Définir la prochaine compétition</span>
        )}
      </button>

      {editing && (
        <Modal title="Prochaine compétition" onClose={() => setEditing(false)}>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
              />
            </div>
            <button
              type="submit"
              className="bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2 transition-colors"
            >
              Enregistrer
            </button>
          </form>
        </Modal>
      )}
    </header>
  );
}

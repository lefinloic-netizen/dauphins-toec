import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { toISODate } from "../../lib/dates";
import PerfChart from "../dashboard/PerfChart";
import type { PerformancePoint } from "../../types/views";

export default function WeightTracker({ athleteId }: { athleteId: string }) {
  const [points, setPoints] = useState<PerformancePoint[]>([]);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("weight_logs")
      .select("id, weight_kg, date")
      .eq("athlete_id", athleteId)
      .order("date");
    setPoints(((data as { id: string; weight_kg: number; date: string }[]) ?? []).map((r) => ({ id: r.id, value_kg: r.weight_kg, date: r.date })));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [athleteId]);

  async function handleSave() {
    if (!weight.trim()) return;
    setSaving(true);
    await supabase
      .from("weight_logs")
      .upsert({ athlete_id: athleteId, weight_kg: Number(weight), date }, { onConflict: "athlete_id,date" });
    setSaving(false);
    setWeight("");
    load();
  }

  const latest = points[points.length - 1];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-700">Suivi de poids</h2>
        {latest && <span className="text-sm text-toec-green-dark font-medium">Dernier : {latest.value_kg} kg</span>}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
        />
        <input
          type="number"
          step="0.1"
          placeholder="Poids (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="flex-1 min-w-0 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm bg-toec-green hover:bg-toec-green-dark text-white rounded-lg px-3 py-1.5 font-medium disabled:opacity-60 shrink-0"
        >
          Enregistrer
        </button>
      </div>

      {!loading && points.length > 0 && <PerfChart points={points} unit="kg" />}
    </div>
  );
}

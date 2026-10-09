import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { toISODate } from "../lib/dates";
import AthleteSessionList, { type SessionWithWarmup } from "../components/athlete/AthleteSessionList";

export default function AthleteHistorique() {
  const { profile } = useAuth();
  const athleteId = profile!.id;

  const [sessions, setSessions] = useState<SessionWithWarmup[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: groupsData } = await supabase.from("athlete_groups").select("group_id").eq("athlete_id", athleteId);
    const groupIds = ((groupsData as { group_id: string }[]) ?? []).map((g) => g.group_id);

    if (groupIds.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("sessions")
      .select("id, name, date, duration_minutes, time_slot, is_template, warmup_text, group:groups(id, name, color)")
      .eq("is_template", false)
      .in("group_id", groupIds)
      .lte("date", toISODate(new Date()))
      .order("date", { ascending: false })
      .limit(100);
    setSessions((data as unknown as SessionWithWarmup[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [athleteId]);

  return (
    <div className="flex flex-col gap-4 pb-10">
      <h1 className="text-lg font-semibold text-gray-900">Historique de mes séances</h1>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Chargement...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <AthleteSessionList athleteId={athleteId} sessions={sessions} onLogged={load} />
        </div>
      )}
    </div>
  );
}

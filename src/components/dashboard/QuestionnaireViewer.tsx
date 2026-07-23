import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { QuestionnaireResponses } from "../../types/database";

const LABELS: Record<string, string> = {
  telephone: "Téléphone",
  profession: "Profession / scolarité",
  activite_travail: "Activité au travail/école",
  sports_actuels: "Sport(s) actuel(s)",
  sports_anterieurs: "Sport(s) antérieur(s)",
  objectifs: "Objectifs sportifs",
  commentaires: "Commentaires",
  sommeil_moyen: "Sommeil moyen (h/nuit)",
  niveau_stress: "Niveau de stress (/10)",
  source_stress: "Source de stress",
  blessures_actuelles: "Blessures actuelles",
};

function label(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function Section({ title, data }: { title: string; data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{title}</div>
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="text-sm">
            <span className="text-gray-400">{label(key)} : </span>
            <span className="text-gray-700">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QuestionnaireViewer({ athleteId }: { athleteId: string }) {
  const [data, setData] = useState<QuestionnaireResponses | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setData(null);
    setOpen(false);
    supabase
      .from("questionnaire_responses")
      .select("*")
      .eq("athlete_id", athleteId)
      .maybeSingle()
      .then(({ data }) => {
        setData((data as QuestionnaireResponses) ?? null);
        setLoaded(true);
      });
  }, [athleteId]);

  if (!loaded) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-toec-green-dark hover:underline flex items-center gap-1"
      >
        <span>{open ? "▲" : "▼"}</span>
        Questionnaire d'entrée {!data && <span className="text-gray-400">(non rempli)</span>}
      </button>

      {open && data && (
        <div className="mt-3 flex flex-col gap-3">
          <Section title="Informations générales" data={data.general} />
          <Section title="Renseignements sportifs" data={data.sport} />
          <Section title="Bien-être" data={data.medical} />
          {data.other_remarks && (
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Autres remarques</div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.other_remarks}</p>
            </div>
          )}
        </div>
      )}

      {open && !data && <p className="text-sm text-gray-400 mt-2">L'athlète n'a pas encore rempli le questionnaire.</p>}
    </div>
  );
}

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { TextInput, TextAreaInput, ScaleInput } from "../components/questionnaire/Fields";

type Section = Record<string, string>;
type TagType = "fort" | "faible" | "a_travailler";

function parseList(text: string): string[] {
  return text
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function deriveAutoTags(medical: Section): { type: TagType; label: string }[] {
  const tags: { type: TagType; label: string }[] = [];
  const stress = Number(medical.niveau_stress || 0);
  const sommeil = Number(medical.sommeil_moyen || 0);
  if (stress >= 7) tags.push({ type: "faible", label: "Stress élevé" });
  if (stress > 0 && stress <= 3) tags.push({ type: "fort", label: "Stress maîtrisé" });
  if (sommeil > 0 && sommeil < 6) tags.push({ type: "faible", label: "Sommeil insuffisant" });
  if (sommeil >= 8) tags.push({ type: "fort", label: "Bon sommeil" });
  if (medical.blessures_actuelles?.trim()) tags.push({ type: "faible", label: "Blessure en cours" });
  return tags;
}

export default function Questionnaire() {
  const { profile } = useAuth();
  const athleteId = profile!.id;

  const [general, setGeneral] = useState<Section>({});
  const [sport, setSport] = useState<Section>({});
  const [medical, setMedical] = useState<Section>({});

  const [fortsMuscu, setFortsMuscu] = useState("");
  const [fortsEau, setFortsEau] = useState("");
  const [faibles, setFaibles] = useState("");
  const [aAmeliorer, setAAmeliorer] = useState("");

  const [otherRemarks, setOtherRemarks] = useState("");

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  function set(setter: (fn: (s: Section) => Section) => void, key: string, value: string) {
    setter((s) => ({ ...s, [key]: value }));
  }

  async function handleSubmit() {
    setSaving(true);

    await supabase.from("questionnaire_responses").upsert(
      {
        athlete_id: athleteId,
        general,
        sport,
        medical,
        measurements: {},
        nutrition: {},
        other_remarks: otherRemarks || null,
      },
      { onConflict: "athlete_id" },
    );

    await supabase.from("athlete_tags").delete().eq("athlete_id", athleteId).eq("source", "questionnaire");

    const tags = [
      ...deriveAutoTags(medical),
      ...parseList(fortsMuscu).map((label) => ({ type: "fort" as const, label })),
      ...parseList(fortsEau).map((label) => ({ type: "fort" as const, label })),
      ...parseList(faibles).map((label) => ({ type: "faible" as const, label })),
      ...parseList(aAmeliorer).map((label) => ({ type: "a_travailler" as const, label })),
    ];

    if (tags.length > 0) {
      await supabase
        .from("athlete_tags")
        .insert(tags.map((t) => ({ athlete_id: athleteId, type: t.type, label: t.label, source: "questionnaire" as const })));
    }

    setSaving(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="text-4xl mb-3">🐬</div>
        <p className="text-gray-700">
          Merci ! Tes réponses me permettent de mieux préparer notre travail ensemble. À très vite 💪
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Questionnaire d'entrée</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tu peux laisser une question vide si tu ne souhaites pas y répondre.
        </p>
      </div>

      <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
        <h2 className="font-semibold text-toec-green-dark text-sm uppercase tracking-wide">Informations générales</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <TextInput label="Téléphone" value={general.telephone ?? ""} onChange={(v) => set(setGeneral, "telephone", v)} />
          <TextInput label="Profession / scolarité" value={general.profession ?? ""} onChange={(v) => set(setGeneral, "profession", v)} />
        </div>
        <ScaleInput
          label="Activité au travail / à l'école (sédentaire → très actif)"
          value={general.activite_travail ?? ""}
          onChange={(v) => set(setGeneral, "activite_travail", v)}
        />
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
        <h2 className="font-semibold text-toec-green-dark text-sm uppercase tracking-wide">Renseignements sportifs</h2>
        <TextAreaInput
          label="Sport(s) pratiqué(s) actuellement, depuis quand, fréquence, durée"
          value={sport.sports_actuels ?? ""}
          onChange={(v) => set(setSport, "sports_actuels", v)}
        />
        <TextAreaInput
          label="Sport(s) antérieurs et durée"
          value={sport.sports_anterieurs ?? ""}
          onChange={(v) => set(setSport, "sports_anterieurs", v)}
        />
        <TextAreaInput label="Objectifs sportifs" value={sport.objectifs ?? ""} onChange={(v) => set(setSport, "objectifs", v)} />
        <TextAreaInput label="Commentaires libres" value={sport.commentaires ?? ""} onChange={(v) => set(setSport, "commentaires", v)} />
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
        <h2 className="font-semibold text-toec-green-dark text-sm uppercase tracking-wide">Bien-être</h2>
        <TextInput
          label="Sommeil moyen (heures/nuit)"
          type="number"
          value={medical.sommeil_moyen ?? ""}
          onChange={(v) => set(setMedical, "sommeil_moyen", v)}
        />
        <ScaleInput label="Niveau de stress" value={medical.niveau_stress ?? ""} onChange={(v) => set(setMedical, "niveau_stress", v)} />
        <TextInput label="Source de stress" value={medical.source_stress ?? ""} onChange={(v) => set(setMedical, "source_stress", v)} />
        <TextAreaInput
          label="Blessures actuelles"
          value={medical.blessures_actuelles ?? ""}
          onChange={(v) => set(setMedical, "blessures_actuelles", v)}
        />
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
        <h2 className="font-semibold text-toec-green-dark text-sm uppercase tracking-wide">Ton auto-évaluation</h2>
        <p className="text-xs text-gray-400 -mt-1">Un point par ligne (ou séparés par une virgule).</p>
        <TextAreaInput
          label="Tes points forts en musculation / préparation physique"
          value={fortsMuscu}
          onChange={setFortsMuscu}
        />
        <TextAreaInput label="Tes points forts dans l'eau (natation)" value={fortsEau} onChange={setFortsEau} />
        <TextAreaInput label="Tes points faibles" value={faibles} onChange={setFaibles} />
        <TextAreaInput label="Ce que tu aimerais améliorer" value={aAmeliorer} onChange={setAAmeliorer} />
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
        <h2 className="font-semibold text-toec-green-dark text-sm uppercase tracking-wide">Autres remarques</h2>
        <TextAreaInput label="" value={otherRemarks} onChange={setOtherRemarks} />
      </section>

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-3 disabled:opacity-60"
      >
        {saving ? "Envoi..." : "Envoyer mes réponses"}
      </button>
    </div>
  );
}

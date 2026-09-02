import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import Modal from "../Modal";
import type { Sex } from "../../types/database";

const PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generatePassword(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  }
  return out;
}

export default function InviteAthleteModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [sex, setSex] = useState<Sex | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase.functions.invoke("invite-athlete", {
      body: {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        sex: sex || undefined,
        birth_date: birthDate || undefined,
        category: category || undefined,
      },
    });

    setSaving(false);

    if (error) {
      let message = error.message;
      const context = (error as { context?: Response }).context;
      if (context) {
        try {
          const body = await context.json();
          if (body?.error) message = body.error;
        } catch {
          // corps non-JSON, on garde le message par défaut
        }
      }
      setError(message);
      return;
    }

    setCreated({ name: `${firstName} ${lastName}`, email, password });
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(created?.password ?? password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // presse-papiers indisponible, l'utilisateur peut toujours sélectionner le texte à la main
    }
  }

  if (created) {
    return (
      <Modal title="Compte créé" onClose={() => { onInvited(); }}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Le compte de <strong>{created.name}</strong> est prêt. Communique-lui ces identifiants (aucun email n'a
            été envoyé) :
          </p>
          <div className="bg-toec-green-light rounded-lg p-4 flex flex-col gap-2">
            <div className="text-sm">
              <span className="text-gray-500">Email : </span>
              <span className="font-medium text-toec-green-dark">{created.email}</span>
            </div>
            <div className="text-sm flex items-center gap-2">
              <span className="text-gray-500">Mot de passe : </span>
              <span className="font-mono font-medium text-toec-green-dark text-base">{created.password}</span>
            </div>
          </div>
          <button
            onClick={copyPassword}
            className="text-sm bg-white border border-toec-green text-toec-green-dark hover:bg-toec-green-light rounded-lg py-2 font-medium"
          >
            {copied ? "Copié !" : "Copier le mot de passe"}
          </button>
          <p className="text-xs text-gray-400">
            Ces informations ne seront plus affichées après fermeture — note-les avant de continuer.
          </p>
          <button
            onClick={() => onInvited()}
            className="bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2"
          >
            Terminé
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Créer un compte athlète" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe initial</label>
          <div className="flex gap-2">
            <input
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-toec-green"
            />
            <button
              type="button"
              onClick={() => setPassword(generatePassword())}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-3 font-medium shrink-0"
            >
              Générer
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Tu devras communiquer ce mot de passe à l'athlète toi-même (aucun email envoyé).
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex | "")}
              className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
            >
              <option value="">—</option>
              <option value="F">F</option>
              <option value="M">M</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toec-green"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2 transition-colors disabled:opacity-60"
        >
          {saving ? "Création..." : "Créer le compte"}
        </button>
      </form>
    </Modal>
  );
}

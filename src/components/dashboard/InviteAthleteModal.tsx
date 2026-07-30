import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import Modal from "../Modal";
import type { Sex } from "../../types/database";

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
  const [sex, setSex] = useState<Sex | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase.functions.invoke("invite-athlete", {
      body: {
        email,
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

    onInvited();
  }

  return (
    <Modal title="Inviter un(e) athlète" onClose={onClose}>
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
          {saving ? "Envoi..." : "Envoyer l'invitation"}
        </button>
      </form>
    </Modal>
  );
}

import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function SetPassword() {
  const { clearNeedsPasswordSetup } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    clearNeedsPasswordSetup();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-toec-green-light px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🐬</div>
          <h1 className="text-xl font-bold text-toec-green-dark">Bienvenue !</h1>
          <p className="text-sm text-gray-500 mt-1">Choisis ton mot de passe pour accéder à ton espace.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirme le mot de passe</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-2 bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2 transition-colors disabled:opacity-60"
          >
            {saving ? "Enregistrement..." : "Valider"}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { session, profile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetSent, setResetSent] = useState(false);

  if (!loading && session && profile) {
    return <Navigate to={profile.role === "coach" ? "/dashboard" : "/mon-espace"} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) setError("Email ou mot de passe incorrect.");
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResetSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-toec-green-light px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🐬</div>
          <h1 className="text-xl font-bold text-toec-green-dark">Dauphins du TOEC</h1>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-toec-green"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2 transition-colors disabled:opacity-60"
            >
              {submitting ? "Connexion..." : "Se connecter"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setResetSent(false);
              }}
              className="text-sm text-toec-green-dark hover:underline"
            >
              Mot de passe oublié ?
            </button>
          </form>
        ) : resetSent ? (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm text-gray-600">
              Si un compte existe avec cet email, un lien pour choisir un nouveau mot de passe vient d'être envoyé.
            </p>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm text-toec-green-dark hover:underline"
            >
              ← Retour à la connexion
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 bg-toec-green hover:bg-toec-green-dark text-white font-medium rounded-lg py-2 transition-colors disabled:opacity-60"
            >
              {submitting ? "Envoi..." : "Envoyer le lien de réinitialisation"}
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm text-toec-green-dark hover:underline"
            >
              ← Retour à la connexion
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

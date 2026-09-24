// Petites fonctions génériques pour sauvegarder un brouillon dans le navigateur
// (survit à un changement d'onglet ou une fermeture de l'app, tant qu'on ne vide
// pas les données du site). Utilisé partout où un formulaire peut être long à remplir.

export function readLocalStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // stockage indisponible (navigation privée, quota...) — on ignore silencieusement
  }
}

export function clearLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

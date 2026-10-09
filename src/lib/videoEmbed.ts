// Convertit un lien YouTube/Vimeo "classique" en URL embarquable dans un <iframe>.
// Retourne null si le format n'est pas reconnu (le lien reste alors ouvrable tel quel).
export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const match = u.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
      if (match) return `https://www.youtube.com/embed/${match[2]}`;
    }

    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }

    return null;
  } catch {
    return null;
  }
}

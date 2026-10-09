import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { toEmbedUrl } from "../lib/videoEmbed";
import Modal from "../components/Modal";
import type { ProtocolLibraryCategory, ProtocolLibraryItem } from "../types/database";

const categoryLabels: Record<ProtocolLibraryCategory, string> = {
  echauffement: "Échauffement",
  mobilite: "Mobilité",
  renfo: "Renfo",
};

const categoryClasses: Record<ProtocolLibraryCategory, string> = {
  echauffement: "bg-cat-cardio-bg text-cat-cardio-text",
  mobilite: "bg-cat-mobilite-bg text-cat-mobilite-text",
  renfo: "bg-cat-renfo-bg text-cat-renfo-text",
};

export default function ProtocolsLibrary() {
  const [items, setItems] = useState<ProtocolLibraryItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<ProtocolLibraryCategory | "all">("all");
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<ProtocolLibraryItem | null>(null);

  useEffect(() => {
    supabase
      .from("protocol_library")
      .select("*")
      .order("order_index")
      .order("title")
      .then(({ data }) => {
        setItems((data as ProtocolLibraryItem[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = items.filter((it) => categoryFilter === "all" || it.category === categoryFilter);
  const embedUrl = viewing?.video_url ? toEmbedUrl(viewing.video_url) : null;

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Protocoles</h1>
        <p className="text-sm text-gray-500">Échauffements, mobilité et renfo par zone du corps.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setCategoryFilter("all")}
          className={`text-xs font-medium rounded-full px-3 py-1.5 ${
            categoryFilter === "all" ? "bg-toec-green text-white" : "bg-white text-gray-600 border border-gray-200"
          }`}
        >
          Tout
        </button>
        {(Object.entries(categoryLabels) as [ProtocolLibraryCategory, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setCategoryFilter(value)}
            className={`text-xs font-medium rounded-full px-3 py-1.5 ${
              categoryFilter === value ? "bg-toec-green text-white" : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Chargement...</div>}

      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
          Aucune fiche disponible pour l'instant.
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => setViewing(item)}
            className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between gap-2 text-left hover:bg-toec-green-light transition-colors"
          >
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">{item.title}</div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className={`inline-block text-xs font-medium rounded-full px-2 py-0.5 ${categoryClasses[item.category]}`}>
                  {categoryLabels[item.category]}
                </span>
                {item.zone && <span className="text-xs text-gray-400">{item.zone}</span>}
              </div>
            </div>
            {item.video_url && <span className="text-lg shrink-0">🎥</span>}
          </button>
        ))}
      </div>

      {viewing && (
        <Modal title={viewing.title} onClose={() => setViewing(null)}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`inline-block text-xs font-medium rounded-full px-2 py-0.5 ${categoryClasses[viewing.category]}`}>
                {categoryLabels[viewing.category]}
              </span>
              {viewing.zone && <span className="text-xs text-gray-400">{viewing.zone}</span>}
            </div>

            {viewing.video_url &&
              (embedUrl ? (
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <a
                  href={viewing.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-toec-green-dark hover:underline"
                >
                  🎥 Voir la vidéo →
                </a>
              ))}

            {viewing.description && <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewing.description}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

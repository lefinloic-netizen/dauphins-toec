import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatFRDate } from "../../lib/dates";
import { formatValue, type RecordUnit } from "../../lib/units";
import type { PerformancePoint } from "../../types/views";

export default function PerfChart({ points, unit = "kg" }: { points: PerformancePoint[]; unit?: RecordUnit }) {
  if (points.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-gray-400">
        Aucune performance enregistrée pour cet exercice.
      </div>
    );
  }

  const data = [...points]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({ date: p.date, valeur: p.value_kg }));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tickFormatter={formatFRDate} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatValue(Number(v), unit)} width={70} />
          <Tooltip
            labelFormatter={(label) => formatFRDate(String(label))}
            formatter={(v) => [formatValue(Number(v), unit), "Valeur"]}
          />
          <Line
            type="monotone"
            dataKey="valeur"
            stroke="#2E9E3A"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

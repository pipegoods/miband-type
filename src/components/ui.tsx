import type { ReactNode } from "react";
import type { EstadoEstres, RRSource } from "../hrv/types";

export function Stat({
  label,
  valor,
  unidad,
  nota,
}: {
  label: string;
  valor: ReactNode;
  unidad?: string;
  nota?: ReactNode;
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-valor">
        {valor}
        {unidad && <small>{unidad}</small>}
      </span>
      {nota && <span className="stat-nota">{nota}</span>}
    </div>
  );
}

export function BadgeFuente({ fuente }: { fuente: RRSource }) {
  return fuente === "real" ? (
    <span className="badge ok" title="El sensor envía intervalos RR latido a latido">
      RR reales
    </span>
  ) : (
    <span
      className="badge aviso"
      title="El sensor solo envía BPM. Los RR se aproximan con 60000/BPM y la variabilidad queda subestimada."
    >
      HRV aproximado
    </span>
  );
}

export function BadgeEstado({ estado }: { estado: EstadoEstres | undefined }) {
  if (!estado) return <span className="badge">—</span>;
  return <span className={`badge estado-${estado}`}>{estado}</span>;
}

export const fmt = (x: number | null | undefined, d = 0) =>
  x == null || !Number.isFinite(x) ? "—" : x.toFixed(d);

export const hora = (t: number) =>
  new Date(t).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

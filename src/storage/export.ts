import type { Ventana } from "../hrv/session";
import type { HrSample, RRPoint } from "../hrv/types";
import type { Sesion, SesionExportada } from "./db";

function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

const base = (s: Sesion) =>
  `sesion-${s.id}-${new Date(s.inicio).toISOString().slice(0, 16).replace(/[:T]/g, "-")}`;

export function exportarJSON(s: Sesion, muestras: HrSample[]) {
  const { id: _id, ...sesion } = s;
  const datos: SesionExportada = { formato: "hrv-estres/1", sesion, muestras };
  descargar(`${base(s)}.json`, JSON.stringify(datos), "application/json");
}

/** Tacograma RR: una fila por intervalo, listo para Kubios, R o Excel. */
export function exportarRRcsv(s: Sesion, puntos: RRPoint[]) {
  const filas = puntos.map((p) => `${new Date(p.t).toISOString()},${(p.t - puntos[0].t) / 1000},${p.rr}`);
  descargar(`${base(s)}-rr.csv`, ["timestamp,segundo,rr_ms", ...filas].join("\n"), "text/csv");
}

const f = (x: number | undefined | null, d = 2) => (x == null ? "" : x.toFixed(d));

export function exportarVentanasCsv(s: Sesion, ventanas: Ventana[]) {
  const head =
    "inicio,n,descartados,mean_rr,mean_hr,sdnn,rmssd,pnn50,mo_s,amo_pct,mxdmn_s,si_baevsky,estado,lf,hf,lf_hf";
  const filas = ventanas.map(({ inicio, metricas: m }) =>
    [
      new Date(inicio).toISOString(),
      m.n,
      m.descartados,
      f(m.meanRR),
      f(m.meanHR),
      f(m.sdnn),
      f(m.rmssd),
      f(m.pnn50),
      f(m.baevsky?.mo, 3),
      f(m.baevsky?.amo),
      f(m.baevsky?.mxdmn, 3),
      f(m.baevsky?.si),
      m.baevsky?.estado ?? "",
      f(m.frecuencia?.lf),
      f(m.frecuencia?.hf),
      f(m.frecuencia?.lfHf),
    ].join(","),
  );
  descargar(`${base(s)}-ventanas.csv`, [head, ...filas].join("\n"), "text/csv");
}

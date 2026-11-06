import { calcularMetricas } from "./metrics";
import type { HrSample, HrvMetrics, RRPoint, RRSource, Umbrales } from "./types";
import { UMBRALES_TESIS } from "./types";

export function detectarFuente(muestras: HrSample[]): RRSource {
  return muestras.some((m) => m.rr.length > 0) ? "real" : "aproximado";
}

/**
 * Convierte las notificaciones del sensor en una serie de intervalos RR.
 *
 * - Con RR reales: los latidos se ubican por suma acumulada de los RR desde el
 *   primer timestamp. Así el tacograma no depende del jitter de las notificaciones BLE.
 * - Sin RR (p. ej. Xiaomi Smart Band con “transmisión de frecuencia cardíaca” que
 *   solo envía BPM): un RR aproximado = 60000 / BPM por notificación.
 */
export function aSerieRR(muestras: HrSample[]): { puntos: RRPoint[]; fuente: RRSource } {
  const fuente = detectarFuente(muestras);
  if (muestras.length === 0) return { puntos: [], fuente };

  if (fuente === "real") {
    let t = muestras.find((m) => m.rr.length > 0)!.t;
    const puntos: RRPoint[] = [];
    for (const m of muestras) {
      for (const rr of m.rr) {
        t += rr;
        puntos.push({ t, rr });
      }
    }
    return { puntos, fuente };
  }

  return {
    puntos: muestras
      .filter((m) => m.bpm > 0)
      .map((m) => ({ t: m.t, rr: Math.round(60000 / m.bpm) })),
    fuente,
  };
}

export interface Ventana {
  inicio: number;
  fin: number;
  metricas: HrvMetrics;
}

/** Divide la serie en ventanas consecutivas de `segundos` y calcula las métricas de cada una. */
export function porVentanas(
  puntos: RRPoint[],
  segundos: number,
  umbrales: Umbrales = UMBRALES_TESIS,
): Ventana[] {
  if (puntos.length === 0) return [];
  const t0 = puntos[0].t;
  const ancho = segundos * 1000;
  const grupos = new Map<number, RRPoint[]>();
  for (const p of puntos) {
    const k = Math.floor((p.t - t0) / ancho);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(p);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a - b)
    .map(([k, ps]) => ({
      inicio: t0 + k * ancho,
      fin: t0 + (k + 1) * ancho,
      metricas: calcularMetricas(ps, umbrales),
    }));
}

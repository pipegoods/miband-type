import type {
  BaevskyResult,
  EstadoEstres,
  FrequencyResult,
  HrvMetrics,
  RRPoint,
  Umbrales,
} from "./types";
import { UMBRALES_TESIS } from "./types";

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Desviación estándar muestral (n − 1), como en Task Force 1996 / Kubios. */
export function sdnn(rr: number[]): number {
  if (rr.length < 2) return 0;
  const m = mean(rr);
  return Math.sqrt(rr.reduce((s, x) => s + (x - m) ** 2, 0) / (rr.length - 1));
}

export function rmssd(rr: number[]): number {
  if (rr.length < 2) return 0;
  let s = 0;
  for (let i = 1; i < rr.length; i++) s += (rr[i] - rr[i - 1]) ** 2;
  return Math.sqrt(s / (rr.length - 1));
}

export function pnn50(rr: number[]): number {
  if (rr.length < 2) return 0;
  let c = 0;
  for (let i = 1; i < rr.length; i++) if (Math.abs(rr[i] - rr[i - 1]) > 50) c++;
  return (c / (rr.length - 1)) * 100;
}

/**
 * Filtro de artefactos:
 *  1. Descarta RR fuera del rango fisiológico (300–2000 ms ≈ 30–200 lpm).
 *  2. Descarta RR que difieren más de `tolerancia` (20 %) de la mediana local
 *     de hasta 10 vecinos (±5), criterio tipo Malik.
 */
export function filtrarArtefactos(
  puntos: RRPoint[],
  tolerancia = 0.2,
): { validos: RRPoint[]; descartados: number } {
  const enRango = puntos.filter((p) => p.rr >= 300 && p.rr <= 2000);
  const validos: RRPoint[] = [];
  for (let i = 0; i < enRango.length; i++) {
    const vecinos: number[] = [];
    for (let j = Math.max(0, i - 5); j <= Math.min(enRango.length - 1, i + 5); j++) {
      if (j !== i) vecinos.push(enRango[j].rr);
    }
    vecinos.sort((a, b) => a - b);
    if (vecinos.length === 0) {
      validos.push(enRango[i]);
      continue;
    }
    const mid = Math.floor(vecinos.length / 2);
    const mediana =
      vecinos.length % 2 ? vecinos[mid] : (vecinos[mid - 1] + vecinos[mid]) / 2;
    if (Math.abs(enRango[i].rr - mediana) <= tolerancia * mediana) {
      validos.push(enRango[i]);
    }
  }
  return { validos, descartados: puntos.length - validos.length };
}

export function clasificar(si: number, u: Umbrales = UMBRALES_TESIS): EstadoEstres {
  if (si < u.relajado) return "relajado";
  if (si < u.estresado) return "normal";
  return "estresado";
}

/**
 * Índice de estrés de Baevsky.
 *
 *   SI = AMo / (2 · Mo · MxDMn)
 *
 * Mo y AMo se obtienen de un histograma con clases de 50 ms (método original
 * de Baevsky). La versión de 2021 de esta tesis usaba la moda de valores
 * exactos, lo que hacía que AMo dependiera de la resolución del sensor.
 */
export function baevsky(
  rr: number[],
  umbrales: Umbrales = UMBRALES_TESIS,
  anchoClase = 50,
): BaevskyResult | null {
  if (rr.length < 2) return null;
  const min = Math.min(...rr);
  const max = Math.max(...rr);
  const mxdmn = (max - min) / 1000;
  if (mxdmn === 0) return null; // Sin variación: SI indefinido (∞).

  const clases = new Map<number, number>();
  for (const x of rr) {
    const k = Math.floor(x / anchoClase);
    clases.set(k, (clases.get(k) ?? 0) + 1);
  }
  let claseModal = 0;
  let cuenta = -1;
  for (const [k, c] of clases) {
    // En empate gana la clase más baja (determinista).
    if (c > cuenta || (c === cuenta && k < claseModal)) {
      claseModal = k;
      cuenta = c;
    }
  }
  const mo = ((claseModal + 0.5) * anchoClase) / 1000;
  const amo = (cuenta / rr.length) * 100;
  const si = amo / (2 * mo * mxdmn);
  return { mo, amo, mxdmn, si, estado: clasificar(si, umbrales) };
}

/** FFT radix-2 in-place (re, im de longitud potencia de 2). */
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = i + j;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/**
 * Spline cúbico natural evaluado en n puntos equiespaciados (i / fs).
 * Resuelve el sistema tridiagonal de segundas derivadas (algoritmo de Thomas).
 */
function splineNatural(x: number[], y: number[], n: number, fs: number): Float64Array {
  const m = x.length;
  const h = new Float64Array(m - 1);
  for (let i = 0; i < m - 1; i++) h[i] = x[i + 1] - x[i] || 1e-9;

  const z = new Float64Array(m); // segundas derivadas; z[0] = z[m-1] = 0
  const c = new Float64Array(m);
  const d = new Float64Array(m);
  for (let i = 1; i < m - 1; i++) {
    const a = h[i - 1];
    const b = 2 * (h[i - 1] + h[i]);
    const cc = h[i];
    const r = 6 * ((y[i + 1] - y[i]) / h[i] - (y[i] - y[i - 1]) / h[i - 1]);
    const den = b - a * c[i - 1];
    c[i] = cc / den;
    d[i] = (r - a * d[i - 1]) / den;
  }
  for (let i = m - 2; i >= 1; i--) z[i] = d[i] - c[i] * z[i + 1];

  const out = new Float64Array(n);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    while (k < m - 2 && x[k + 1] < t) k++;
    const hk = h[k];
    const A = (x[k + 1] - t) / hk;
    const B = (t - x[k]) / hk;
    out[i] =
      A * y[k] +
      B * y[k + 1] +
      ((A ** 3 - A) * z[k] + (B ** 3 - B) * z[k + 1]) * (hk * hk) / 6;
  }
  return out;
}

/**
 * Análisis espectral: el tacograma se remuestrea a 4 Hz con spline cúbico,
 * se le quita la tendencia lineal, se aplica ventana de Hann y se calcula el
 * periodograma con FFT. Requiere al menos 120 s de datos (Task Force 1996
 * recomienda 5 min para LF).
 */
export function frecuencia(puntos: RRPoint[], fs = 4): FrequencyResult | null {
  if (puntos.length < 10) return null;
  const t0 = puntos[0].t;
  const ts = puntos.map((p) => (p.t - t0) / 1000);
  const dur = ts[ts.length - 1];
  if (dur < 120) return null;

  const n = Math.floor(dur * fs) + 1;
  const y = splineNatural(
    ts,
    puntos.map((p) => p.rr),
    n,
    fs,
  );

  // Quitar tendencia lineal (mínimos cuadrados).
  const xm = (n - 1) / 2;
  const ym = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (i - xm) * (y[i] - ym);
    sxx += (i - xm) ** 2;
  }
  const pendiente = sxy / sxx;

  let nfft = 1;
  while (nfft < n) nfft <<= 1;
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  let u = 0; // energía de la ventana
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    re[i] = (y[i] - ym - pendiente * (i - xm)) * w;
    u += w * w;
  }
  fft(re, im);

  // Densidad espectral unilateral (ms²/Hz), integrada por bandas.
  const df = fs / nfft;
  let lf = 0;
  let hf = 0;
  for (let i = 1; i < nfft / 2; i++) {
    const f = i * df;
    const psd = (2 * (re[i] ** 2 + im[i] ** 2)) / (fs * u);
    if (f >= 0.04 && f < 0.15) lf += psd * df;
    else if (f >= 0.15 && f < 0.4) hf += psd * df;
  }
  return { lf, hf, lfHf: hf > 0 ? lf / hf : 0 };
}

export function calcularMetricas(
  puntos: RRPoint[],
  umbrales: Umbrales = UMBRALES_TESIS,
): HrvMetrics {
  const { validos, descartados } = filtrarArtefactos(puntos);
  const rr = validos.map((p) => p.rr);
  const meanRR = rr.length ? mean(rr) : 0;
  return {
    n: rr.length,
    descartados,
    meanRR,
    meanHR: meanRR ? 60000 / meanRR : 0,
    sdnn: sdnn(rr),
    rmssd: rmssd(rr),
    pnn50: pnn50(rr),
    baevsky: baevsky(rr, umbrales),
    frecuencia: frecuencia(validos),
  };
}

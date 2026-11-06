/** Una notificación del sensor, ya decodificada y con marca de tiempo. */
export interface HrSample {
  /** Marca de tiempo (ms desde epoch) en que llegó la notificación. */
  t: number;
  /** Frecuencia cardíaca reportada por el sensor (lpm). */
  bpm: number;
  /** Intervalos RR (ms) incluidos en la notificación. Vacío si el sensor no los envía. */
  rr: number[];
}

/** Un intervalo RR ubicado en el tiempo. */
export interface RRPoint {
  /** Marca de tiempo (ms) del latido que cierra el intervalo. */
  t: number;
  /** Duración del intervalo (ms). */
  rr: number;
}

/**
 * Origen de los RR:
 * - "real": intervalos latido a latido enviados por el sensor (campo RR del estándar BLE).
 * - "aproximado": derivados de 60000 / BPM. Útil como referencia, pero subestima la variabilidad.
 */
export type RRSource = "real" | "aproximado";

export type EstadoEstres = "relajado" | "normal" | "estresado";

export interface HrvMetrics {
  /** Número de RR usados (después del filtrado de artefactos). */
  n: number;
  /** RR descartados como artefactos. */
  descartados: number;
  meanRR: number;
  meanHR: number;
  /** Desviación estándar de los RR (ms). */
  sdnn: number;
  /** Raíz cuadrática media de las diferencias sucesivas (ms). */
  rmssd: number;
  /** % de diferencias sucesivas > 50 ms. */
  pnn50: number;
  baevsky: BaevskyResult | null;
  /** Potencia espectral; null si la ventana es demasiado corta (< 120 s). */
  frecuencia: FrequencyResult | null;
}

export interface BaevskyResult {
  /** Moda (s): centro de la clase más frecuente del histograma de 50 ms. */
  mo: number;
  /** Amplitud de la moda (%): proporción de RR en la clase modal. */
  amo: number;
  /** Rango de variación (s): RRmax − RRmin. */
  mxdmn: number;
  /** Índice de estrés de Baevsky: AMo / (2 · Mo · MxDMn). */
  si: number;
  estado: EstadoEstres;
}

export interface FrequencyResult {
  /** Potencia LF 0.04–0.15 Hz (ms²). */
  lf: number;
  /** Potencia HF 0.15–0.40 Hz (ms²). */
  hf: number;
  lfHf: number;
}

export interface Umbrales {
  /** SI por debajo de este valor → relajado. */
  relajado: number;
  /** SI desde este valor → estresado. */
  estresado: number;
}

/** Umbrales de la tesis original (2021): < 40 relajado, 40–150 normal, ≥ 150 estresado. */
export const UMBRALES_TESIS: Umbrales = { relajado: 40, estresado: 150 };

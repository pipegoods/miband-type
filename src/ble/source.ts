import type { HrSample } from "../hrv/types";

/** Fuente de datos de frecuencia cardíaca: un sensor BLE real o el simulador. */
export interface HrSource {
  nombre: string;
  detener(): Promise<void>;
}

export interface HrSourceCallbacks {
  onSample(s: HrSample): void;
  onDesconectado(): void;
}

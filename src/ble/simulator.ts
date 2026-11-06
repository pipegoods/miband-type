import type { HrSource, HrSourceCallbacks } from "./source";

export interface OpcionesSimulador {
  /** true: envía RR reales; false: solo BPM (como la Xiaomi Smart Band). */
  conRR: boolean;
  /** Acelera el tiempo para demos (1 = tiempo real). */
  velocidad?: number;
}

/**
 * Genera latidos sintéticos con arritmia sinusal respiratoria (HF ≈ 0.25 Hz),
 * una onda de Mayer (LF ≈ 0.1 Hz) y ruido. Cada 3 minutos alterna entre un
 * estado “relajado” (alta variabilidad) y “estrés” (FC alta, baja variabilidad),
 * útil para probar la app y para la demostración en la defensa.
 */
export function iniciarSimulador(cb: HrSourceCallbacks, op: OpcionesSimulador): HrSource {
  const velocidad = op.velocidad ?? 1;
  const inicio = Date.now();
  let tSim = inicio;
  let pendientes: number[] = [];
  let ultimoEnvio = tSim;
  let detenido = false;

  const siguienteRR = () => {
    // Empieza siempre en reposo; cambia a estrés a los 3 min.
    const s = ((tSim - inicio) / 1000) % 360;
    const estres = s >= 180;
    const base = estres ? 650 : 900;
    const amp = estres ? 8 : 45;
    const tt = tSim / 1000;
    return Math.round(
      base +
        amp * Math.sin(2 * Math.PI * 0.25 * tt) +
        amp * 0.6 * Math.sin(2 * Math.PI * 0.1 * tt) +
        (Math.random() - 0.5) * (estres ? 10 : 30),
    );
  };

  const tick = () => {
    if (detenido) return;
    const rr = siguienteRR();
    tSim += rr;
    pendientes.push(rr);
    // Los sensores BLE notifican ~1 vez por segundo agrupando los RR del periodo.
    if (tSim - ultimoEnvio >= 1000) {
      const media = pendientes.reduce((a, b) => a + b, 0) / pendientes.length;
      cb.onSample({
        t: tSim,
        bpm: Math.round(60000 / media),
        rr: op.conRR ? pendientes : [],
      });
      pendientes = [];
      ultimoEnvio = tSim;
    }
    timer = setTimeout(tick, rr / velocidad);
  };
  let timer = setTimeout(tick, 0);

  return {
    nombre: op.conRR ? "Simulador (RR reales)" : "Simulador (solo BPM)",
    async detener() {
      detenido = true;
      clearTimeout(timer);
    },
  };
}

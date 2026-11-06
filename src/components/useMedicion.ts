import { useCallback, useEffect, useRef, useState } from "react";
import { conectarSensor } from "../ble/bluetoothSensor";
import { iniciarSimulador } from "../ble/simulator";
import type { HrSource } from "../ble/source";
import type { HrSample } from "../hrv/types";
import { cerrarSesion, crearSesion, guardarMuestras } from "../storage/db";

export type TipoFuente = "ble" | "sim-rr" | "sim-bpm";
export type Estado = "inactivo" | "conectando" | "midiendo";

/** Conecta la fuente, guarda las muestras en IndexedDB cada 5 s y expone la serie en vivo. */
export function useMedicion() {
  const [estado, setEstado] = useState<Estado>("inactivo");
  const [muestras, setMuestras] = useState<HrSample[]>([]);
  const [dispositivo, setDispositivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fuente = useRef<HrSource | null>(null);
  const sesionId = useRef<number | null>(null);
  const buffer = useRef<HrSample[]>([]);

  const volcar = useCallback(async () => {
    if (sesionId.current == null || buffer.current.length === 0) return;
    const lote = buffer.current;
    buffer.current = [];
    await guardarMuestras(sesionId.current, lote);
  }, []);

  useEffect(() => {
    if (estado !== "midiendo") return;
    const id = setInterval(volcar, 5000);
    return () => clearInterval(id);
  }, [estado, volcar]);

  const detener = useCallback(async (): Promise<number | null> => {
    const id = sesionId.current;
    await fuente.current?.detener();
    fuente.current = null;
    await volcar();
    if (id != null) await cerrarSesion(id);
    sesionId.current = null;
    setEstado("inactivo");
    return id;
  }, [volcar]);

  const iniciar = useCallback(
    async (tipo: TipoFuente, actividad: string) => {
      setError(null);
      setMuestras([]);
      setEstado("conectando");
      const callbacks = {
        onSample: (s: HrSample) => {
          buffer.current.push(s);
          setMuestras((prev) => [...prev, s]);
        },
        onDesconectado: () => {
          setError("El sensor se desconectó. La sesión se guardó hasta este punto.");
          void detener();
        },
      };
      try {
        const f =
          tipo === "ble"
            ? await conectarSensor(callbacks)
            : iniciarSimulador(callbacks, { conRR: tipo === "sim-rr" });
        fuente.current = f;
        setDispositivo(f.nombre);
        sesionId.current = await crearSesion(actividad || "Sin nombre", f.nombre);
        setEstado("midiendo");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Cancelar el selector de dispositivos no es un error para el usuario.
        if (!/cancel/i.test(msg)) setError(msg);
        setEstado("inactivo");
      }
    },
    [detener],
  );

  useEffect(() => () => void fuente.current?.detener(), []);

  return { estado, muestras, dispositivo, error, iniciar, detener };
}

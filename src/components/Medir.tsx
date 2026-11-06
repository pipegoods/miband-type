import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { bluetoothDisponible } from "../ble/bluetoothSensor";
import { calcularMetricas } from "../hrv/metrics";
import { aSerieRR } from "../hrv/session";
import { BadgeEstado, BadgeFuente, Stat, fmt } from "./ui";
import { useMedicion, type TipoFuente } from "./useMedicion";

const VENTANA_VIVO_S = 60;

export default function Medir({ onTerminada }: { onTerminada: (id: number) => void }) {
  const { estado, muestras, dispositivo, error, iniciar, detener } = useMedicion();
  const [actividad, setActividad] = useState("Reposo sentado");
  const [tipo, setTipo] = useState<TipoFuente>(bluetoothDisponible() ? "ble" : "sim-rr");

  const { puntos, fuente } = useMemo(() => aSerieRR(muestras), [muestras]);
  const ultima = muestras.at(-1);
  const t0 = muestras[0]?.t ?? 0;

  const recientes = useMemo(() => {
    const fin = puntos.at(-1)?.t ?? 0;
    return puntos.filter((p) => p.t >= fin - VENTANA_VIVO_S * 1000);
  }, [puntos]);
  const m = useMemo(() => calcularMetricas(recientes), [recientes]);

  const grafica = useMemo(() => {
    const fin = puntos.at(-1)?.t ?? 0;
    return puntos
      .filter((p) => p.t >= fin - 120_000)
      .map((p) => ({ s: (p.t - t0) / 1000, rr: p.rr }));
  }, [puntos, t0]);

  const midiendo = estado === "midiendo";
  const duracion = ultima ? Math.round((ultima.t - t0) / 1000) : 0;

  return (
    <div className="stack">
      <section className="card controles">
        <label className="campo">
          <span>Actividad</span>
          <input
            value={actividad}
            onChange={(e) => setActividad(e.target.value)}
            disabled={estado !== "inactivo"}
            placeholder="Ej. Examen, reposo, correr…"
          />
        </label>
        <label className="campo">
          <span>Fuente</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoFuente)}
            disabled={estado !== "inactivo"}
          >
            <option value="ble" disabled={!bluetoothDisponible()}>
              Sensor Bluetooth (Smart Band / banda de pecho)
            </option>
            <option value="sim-rr">Simulador · con RR</option>
            <option value="sim-bpm">Simulador · solo BPM</option>
          </select>
        </label>
        {midiendo ? (
          <button
            className="btn peligro"
            onClick={async () => {
              const id = await detener();
              if (id != null) onTerminada(id);
            }}
          >
            Detener y analizar
          </button>
        ) : (
          <button
            className="btn primario"
            disabled={estado === "conectando"}
            onClick={() => iniciar(tipo, actividad)}
          >
            {estado === "conectando" ? "Conectando…" : "Iniciar sesión"}
          </button>
        )}
      </section>

      {!bluetoothDisponible() && (
        <p className="aviso-box">
          Este navegador no soporta Web Bluetooth. Abre la app en Chrome o Edge (escritorio o
          Android) para conectar la pulsera. Mientras tanto puedes usar el simulador.
        </p>
      )}
      {tipo === "ble" && estado === "inactivo" && bluetoothDisponible() && (
        <p className="nota">
          En la Xiaomi Smart Band: <b>Ajustes → Frecuencia cardíaca → Transmisión de frecuencia
          cardíaca</b> (o inicia un entrenamiento con la transmisión activa). Luego pulsa “Iniciar
          sesión” y elige la pulsera en la lista.
        </p>
      )}
      {error && <p className="error-box">{error}</p>}

      {(midiendo || muestras.length > 0) && (
        <>
          <section className="card">
            <div className="card-head">
              <h2>
                {midiendo && <span className="pulso" aria-hidden="true" />}
                {dispositivo}
              </h2>
              <div className="fila">
                <BadgeFuente fuente={fuente} />
                <span className="muted">
                  {Math.floor(duracion / 60)}:{String(duracion % 60).padStart(2, "0")}
                </span>
              </div>
            </div>
            <div className="stats">
              <Stat label="Frecuencia" valor={ultima?.bpm ?? "—"} unidad="lpm" />
              <Stat label="Último RR" valor={fmt(puntos.at(-1)?.rr)} unidad="ms" />
              <Stat
                label={`SI Baevsky · ${VENTANA_VIVO_S}s`}
                valor={fmt(m.baevsky?.si)}
                nota={<BadgeEstado estado={m.baevsky?.estado} />}
              />
              <Stat label="RMSSD" valor={fmt(m.rmssd, 1)} unidad="ms" />
              <Stat label="SDNN" valor={fmt(m.sdnn, 1)} unidad="ms" />
            </div>
          </section>

          <section className="card">
            <h2>Tacograma · últimos 2 min</h2>
            <div className="chart">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={grafica} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke="var(--grid)" vertical={false} />
                  <XAxis
                    dataKey="s"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(s: number) => `${Math.round(s)}s`}
                    stroke="var(--muted)"
                    fontSize={12}
                  />
                  <YAxis domain={["auto", "auto"]} stroke="var(--muted)" fontSize={12} unit="" />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    labelFormatter={(s) => `${Number(s).toFixed(1)} s`}
                    formatter={(v) => [`${v} ms`, "RR"]}
                  />
                  <Line
                    type="linear"
                    dataKey="rr"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

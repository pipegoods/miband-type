import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calcularMetricas } from "../hrv/metrics";
import { aSerieRR, porVentanas } from "../hrv/session";
import { UMBRALES_TESIS, type EstadoEstres, type Umbrales } from "../hrv/types";
import { borrarSesion, db, muestrasDeSesion } from "../storage/db";
import { exportarJSON, exportarRRcsv, exportarVentanasCsv } from "../storage/export";
import { BadgeEstado, BadgeFuente, Stat, fmt, hora } from "./ui";

const COLOR_ESTADO: Record<EstadoEstres, string> = {
  relajado: "var(--relajado)",
  normal: "var(--normal)",
  estresado: "var(--estresado)",
};

const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--border)" };

export default function Detalle({ id, onVolver }: { id: number; onVolver: () => void }) {
  const sesion = useLiveQuery(() => db.sesiones.get(id), [id]);
  const muestras = useLiveQuery(() => muestrasDeSesion(id), [id]);
  const [segundos, setSegundos] = useState(60);
  const [umbrales, setUmbrales] = useState<Umbrales>(UMBRALES_TESIS);

  const { puntos, fuente } = useMemo(() => aSerieRR(muestras ?? []), [muestras]);
  const total = useMemo(() => calcularMetricas(puntos, umbrales), [puntos, umbrales]);
  const ventanas = useMemo(
    () => porVentanas(puntos, segundos, umbrales),
    [puntos, segundos, umbrales],
  );

  const t0 = puntos[0]?.t ?? 0;
  const tacograma = useMemo(
    () => puntos.map((p) => ({ min: (p.t - t0) / 60000, rr: p.rr })),
    [puntos, t0],
  );
  const serieVentanas = ventanas.map((v) => ({
    etiqueta: hora(v.inicio),
    si: v.metricas.baevsky?.si ?? null,
    estado: v.metricas.baevsky?.estado,
    rmssd: v.metricas.rmssd,
  }));

  if (sesion === undefined || muestras === undefined) return null;
  if (sesion === null) {
    return (
      <section className="card">
        <p>La sesión no existe.</p>
        <button className="btn" onClick={onVolver}>
          Volver
        </button>
      </section>
    );
  }

  const reparto = ventanas.reduce(
    (acc, v) => {
      const e = v.metricas.baevsky?.estado;
      if (e) acc[e]++;
      return acc;
    },
    { relajado: 0, normal: 0, estresado: 0 } as Record<EstadoEstres, number>,
  );

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head">
          <div>
            <button className="link" onClick={onVolver}>
              ← Sesiones
            </button>
            <h2>{sesion.actividad}</h2>
            <p className="muted">
              {new Date(sesion.inicio).toLocaleString("es", {
                dateStyle: "full",
                timeStyle: "short",
              })}{" "}
              · {sesion.dispositivo}
            </p>
          </div>
          <BadgeFuente fuente={fuente} />
        </div>

        {fuente === "aproximado" && (
          <p className="aviso-box">
            Este sensor no envió intervalos RR; se usaron RR aproximados (60000 / BPM, ~1 por
            segundo). RMSSD, pNN50 y el espectro quedan subestimados, y el SI de Baevsky tiende a
            salir alto. Para resultados válidos usa un sensor con RR (p. ej. banda de pecho).
          </p>
        )}

        <div className="stats">
          <Stat label="FC media" valor={fmt(total.meanHR)} unidad="lpm" />
          <Stat
            label="SI Baevsky (sesión)"
            valor={fmt(total.baevsky?.si)}
            nota={<BadgeEstado estado={total.baevsky?.estado} />}
          />
          <Stat label="RMSSD" valor={fmt(total.rmssd, 1)} unidad="ms" />
          <Stat label="SDNN" valor={fmt(total.sdnn, 1)} unidad="ms" />
          <Stat label="pNN50" valor={fmt(total.pnn50, 1)} unidad="%" />
          <Stat
            label="LF/HF"
            valor={fmt(total.frecuencia?.lfHf, 2)}
            nota={total.frecuencia ? null : <span className="muted">requiere ≥ 2 min</span>}
          />
        </div>
        <p className="muted pequeno">
          {total.n} RR válidos · {total.descartados} descartados como artefactos
          {total.baevsky &&
            ` · Mo ${fmt(total.baevsky.mo, 3)} s · AMo ${fmt(total.baevsky.amo, 1)} % · MxDMn ${fmt(total.baevsky.mxdmn, 3)} s`}
        </p>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Índice de estrés por ventana</h2>
          <div className="fila">
            <label className="campo inline">
              <span>Ventana</span>
              <select value={segundos} onChange={(e) => setSegundos(Number(e.target.value))}>
                <option value={60}>1 min</option>
                <option value={120}>2 min</option>
                <option value={300}>5 min</option>
              </select>
            </label>
            <label className="campo inline">
              <span>Relajado &lt;</span>
              <input
                type="number"
                value={umbrales.relajado}
                onChange={(e) => setUmbrales({ ...umbrales, relajado: Number(e.target.value) })}
              />
            </label>
            <label className="campo inline">
              <span>Estrés ≥</span>
              <input
                type="number"
                value={umbrales.estresado}
                onChange={(e) => setUmbrales({ ...umbrales, estresado: Number(e.target.value) })}
              />
            </label>
          </div>
        </div>
        <div className="leyenda">
          <span>
            <i style={{ background: COLOR_ESTADO.relajado }} /> Relajado {reparto.relajado}
          </span>
          <span>
            <i style={{ background: COLOR_ESTADO.normal }} /> Normal {reparto.normal}
          </span>
          <span>
            <i style={{ background: COLOR_ESTADO.estresado }} /> Estresado {reparto.estresado}
          </span>
        </div>
        <div className="chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={serieVentanas} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="etiqueta" stroke="var(--muted)" fontSize={12} minTickGap={24} />
              <YAxis stroke="var(--muted)" fontSize={12} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "var(--grid)" }}
                formatter={(v) => [fmt(Number(v)), "SI"]}
              />
              <ReferenceLine y={umbrales.relajado} stroke="var(--relajado)" strokeDasharray="4 4" />
              <ReferenceLine y={umbrales.estresado} stroke="var(--estresado)" strokeDasharray="4 4" />
              <Bar dataKey="si" radius={[3, 3, 0, 0]}>
                {serieVentanas.map((v, i) => (
                  <Cell key={i} fill={v.estado ? COLOR_ESTADO[v.estado] : "var(--muted)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2>Tacograma RR</h2>
        <div className="chart">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={tacograma} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="min"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(m: number) =>
                  `${Math.floor(m)}:${String(Math.round((m % 1) * 60) % 60).padStart(2, "0")}`
                }
                stroke="var(--muted)"
                fontSize={12}
              />
              <YAxis domain={["auto", "auto"]} stroke="var(--muted)" fontSize={12} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(m) => `${Number(m).toFixed(2)} min`}
                formatter={(v) => [`${v} ms`, "RR"]}
              />
              <Line
                dataKey="rr"
                stroke="var(--accent)"
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2>Detalle por ventana</h2>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Inicio</th>
                <th>RR</th>
                <th>FC</th>
                <th>RMSSD</th>
                <th>SDNN</th>
                <th>Mo (s)</th>
                <th>AMo (%)</th>
                <th>MxDMn (s)</th>
                <th>SI</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {ventanas.map(({ inicio, metricas: m }) => (
                <tr key={inicio}>
                  <td>{hora(inicio)}</td>
                  <td>
                    {m.n}
                    {m.descartados > 0 && <span className="muted"> (−{m.descartados})</span>}
                  </td>
                  <td>{fmt(m.meanHR)}</td>
                  <td>{fmt(m.rmssd, 1)}</td>
                  <td>{fmt(m.sdnn, 1)}</td>
                  <td>{fmt(m.baevsky?.mo, 3)}</td>
                  <td>{fmt(m.baevsky?.amo, 1)}</td>
                  <td>{fmt(m.baevsky?.mxdmn, 3)}</td>
                  <td>
                    <b>{fmt(m.baevsky?.si)}</b>
                  </td>
                  <td>
                    <BadgeEstado estado={m.baevsky?.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card fila acciones">
        <button className="btn" onClick={() => exportarRRcsv(sesion, puntos)}>
          Exportar RR (CSV)
        </button>
        <button className="btn" onClick={() => exportarVentanasCsv(sesion, ventanas)}>
          Exportar ventanas (CSV)
        </button>
        <button className="btn" onClick={() => exportarJSON(sesion, muestras)}>
          Exportar sesión (JSON)
        </button>
        <span className="spacer" />
        <button
          className="btn peligro-sutil"
          onClick={async () => {
            if (confirm(`¿Borrar la sesión “${sesion.actividad}”? No se puede deshacer.`)) {
              await borrarSesion(id);
              onVolver();
            }
          }}
        >
          Borrar
        </button>
      </section>
    </div>
  );
}

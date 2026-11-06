import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { db, importarSesion, type SesionExportada } from "../storage/db";
import Detalle from "./Detalle";

export default function Sesiones({
  seleccion,
  onSeleccion,
}: {
  seleccion: number | null;
  onSeleccion: (id: number | null) => void;
}) {
  const sesiones = useLiveQuery(() => db.sesiones.orderBy("inicio").reverse().toArray(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const importar = async (file: File) => {
    try {
      const datos = JSON.parse(await file.text()) as SesionExportada;
      onSeleccion(await importarSesion(datos));
      setError(null);
    } catch (e) {
      setError(`No se pudo importar: ${e instanceof Error ? e.message : e}`);
    }
  };

  if (seleccion != null) {
    return <Detalle id={seleccion} onVolver={() => onSeleccion(null)} />;
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head">
          <h2>Sesiones guardadas</h2>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Importar JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importar(f);
              e.target.value = "";
            }}
          />
        </div>
        {error && <p className="error-box">{error}</p>}
        {sesiones === undefined ? null : sesiones.length === 0 ? (
          <p className="muted vacio">
            Aún no hay sesiones. Ve a <b>Medir</b> para registrar la primera.
          </p>
        ) : (
          <ul className="lista">
            {sesiones.map((s) => {
              const dur = s.fin ? Math.round((s.fin - s.inicio) / 60000) : null;
              return (
                <li key={s.id}>
                  <button onClick={() => onSeleccion(s.id!)}>
                    <span className="lista-titulo">{s.actividad}</span>
                    <span className="muted">
                      {new Date(s.inicio).toLocaleString("es", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {" · "}
                      {s.dispositivo}
                      {" · "}
                      {dur != null ? `${dur} min` : "sin cerrar"}
                      {" · "}
                      {s.muestras} muestras
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

import { useState } from "react";
import Medir from "./components/Medir";
import Sesiones from "./components/Sesiones";
import Metodo from "./components/Metodo";

type Vista = "medir" | "sesiones" | "metodo";

const VISTAS: { id: Vista; label: string }[] = [
  { id: "medir", label: "Medir" },
  { id: "sesiones", label: "Sesiones" },
  { id: "metodo", label: "Método" },
];

export default function App() {
  const [vista, setVista] = useState<Vista>("medir");
  const [sesionAbierta, setSesionAbierta] = useState<number | null>(null);

  return (
    <div className="app">
      <header className="top">
        <div className="marca">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M2 17h7l3-8 4 15 3-11 2 4h9" />
          </svg>
          <div>
            <h1>Variabilidad cardíaca</h1>
            <p>Índice de estrés de Baevsky · HRV</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Secciones">
          {VISTAS.map((v) => (
            <button
              key={v.id}
              className={vista === v.id ? "activo" : ""}
              aria-current={vista === v.id ? "page" : undefined}
              onClick={() => setVista(v.id)}
            >
              {v.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {vista === "medir" && (
          <Medir
            onTerminada={(id) => {
              setSesionAbierta(id);
              setVista("sesiones");
            }}
          />
        )}
        {vista === "sesiones" && (
          <Sesiones seleccion={sesionAbierta} onSeleccion={setSesionAbierta} />
        )}
        {vista === "metodo" && <Metodo />}
      </main>

      <footer>Los datos se guardan solo en este navegador (IndexedDB).</footer>
    </div>
  );
}

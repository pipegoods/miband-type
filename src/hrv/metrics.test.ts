import { describe, expect, it } from "vitest";
import {
  baevsky,
  calcularMetricas,
  clasificar,
  filtrarArtefactos,
  frecuencia,
  pnn50,
  rmssd,
  sdnn,
} from "./metrics";
import type { RRPoint } from "./types";

const aPuntos = (rr: number[]): RRPoint[] => {
  let t = 0;
  return rr.map((x) => ({ t: (t += x), rr: x }));
};

describe("dominio del tiempo", () => {
  const rr = [800, 810, 790, 800];

  it("SDNN muestral", () => {
    // desviaciones 0, 10, −10, 0 → 200 / 3
    expect(sdnn(rr)).toBeCloseTo(Math.sqrt(200 / 3), 6);
  });

  it("RMSSD", () => {
    // diferencias 10, −20, 10 → 600 / 3
    expect(rmssd(rr)).toBeCloseTo(Math.sqrt(200), 6);
  });

  it("pNN50", () => {
    expect(pnn50(rr)).toBe(0);
    expect(pnn50([800, 900, 880, 800])).toBeCloseTo((2 / 3) * 100, 6);
  });

  it("casos con menos de 2 RR", () => {
    expect(sdnn([800])).toBe(0);
    expect(rmssd([])).toBe(0);
  });
});

describe("índice de Baevsky", () => {
  it("usa histograma de 50 ms", () => {
    // clases: 800,810,800,820 → [800,850); 790 → [750,800)
    const r = baevsky([800, 810, 790, 800, 820])!;
    expect(r.mo).toBeCloseTo(0.825, 6);
    expect(r.amo).toBeCloseTo(80, 6);
    expect(r.mxdmn).toBeCloseTo(0.03, 6);
    expect(r.si).toBeCloseTo(80 / (2 * 0.825 * 0.03), 4);
    expect(r.estado).toBe("estresado");
  });

  it("variabilidad alta → SI bajo → relajado", () => {
    const rr = Array.from({ length: 60 }, (_, i) => 900 + 250 * Math.sin(i / 2));
    const r = baevsky(rr)!;
    expect(r.si).toBeLessThan(40);
    expect(r.estado).toBe("relajado");
  });

  it("sin variación devuelve null en vez de Infinity", () => {
    expect(baevsky([800, 800, 800])).toBeNull();
  });

  it("clasificación con umbrales de la tesis", () => {
    expect(clasificar(39.9)).toBe("relajado");
    expect(clasificar(40)).toBe("normal");
    expect(clasificar(149.9)).toBe("normal");
    expect(clasificar(150)).toBe("estresado");
    expect(clasificar(100, { relajado: 50, estresado: 90 })).toBe("estresado");
  });
});

describe("filtro de artefactos", () => {
  it("descarta fuera de rango y latidos ectópicos", () => {
    const { validos, descartados } = filtrarArtefactos(
      aPuntos([800, 810, 1600, 800, 250, 790, 805]),
    );
    expect(validos.map((p) => p.rr)).toEqual([800, 810, 800, 790, 805]);
    expect(descartados).toBe(2);
  });
});

describe("dominio de la frecuencia", () => {
  const sintetico = (fHz: number, seg = 300) => {
    const pts: RRPoint[] = [];
    let t = 0;
    while (t < seg * 1000) {
      const rr = 1000 + 40 * Math.sin(2 * Math.PI * fHz * (t / 1000));
      t += rr;
      pts.push({ t, rr });
    }
    return pts;
  };

  it("oscilación a 0.25 Hz cae en HF", () => {
    const r = frecuencia(sintetico(0.25))!;
    expect(r.hf).toBeGreaterThan(10 * r.lf);
  });

  it("oscilación a 0.1 Hz cae en LF", () => {
    const r = frecuencia(sintetico(0.1))!;
    expect(r.lf).toBeGreaterThan(10 * r.hf);
  });

  it("la potencia total aproxima la varianza (Parseval)", () => {
    // Senoide de amplitud 40 ms → varianza 800 ms²
    const r = frecuencia(sintetico(0.25))!;
    expect(r.lf + r.hf).toBeGreaterThan(600);
    expect(r.lf + r.hf).toBeLessThan(1000);
  });

  it("null si la ventana dura menos de 120 s", () => {
    expect(frecuencia(sintetico(0.25, 60))).toBeNull();
  });
});

describe("calcularMetricas", () => {
  it("integra filtrado y métricas", () => {
    const m = calcularMetricas(aPuntos([800, 810, 790, 800, 3000]));
    expect(m.n).toBe(4);
    expect(m.descartados).toBe(1);
    expect(m.meanHR).toBeCloseTo(75, 6);
    expect(m.frecuencia).toBeNull();
  });
});

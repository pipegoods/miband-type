import { describe, expect, it } from "vitest";
import { aSerieRR, porVentanas } from "./session";

describe("aSerieRR", () => {
  it("con RR reales ubica latidos por suma acumulada", () => {
    const { puntos, fuente } = aSerieRR([
      { t: 10_000, bpm: 75, rr: [800, 820] },
      { t: 11_700, bpm: 74, rr: [810] },
    ]);
    expect(fuente).toBe("real");
    expect(puntos).toEqual([
      { t: 10_800, rr: 800 },
      { t: 11_620, rr: 820 },
      { t: 12_430, rr: 810 },
    ]);
  });

  it("sin RR aproxima con 60000 / BPM", () => {
    const { puntos, fuente } = aSerieRR([
      { t: 0, bpm: 75, rr: [] },
      { t: 1000, bpm: 0, rr: [] },
      { t: 2000, bpm: 80, rr: [] },
    ]);
    expect(fuente).toBe("aproximado");
    expect(puntos).toEqual([
      { t: 0, rr: 800 },
      { t: 2000, rr: 750 },
    ]);
  });
});

describe("porVentanas", () => {
  it("agrupa en ventanas consecutivas", () => {
    const puntos = Array.from({ length: 150 }, (_, i) => ({ t: i * 1000, rr: 800 + (i % 3) * 10 }));
    const v = porVentanas(puntos, 60);
    expect(v).toHaveLength(3);
    expect(v.map((x) => x.metricas.n)).toEqual([60, 60, 30]);
    expect(v[1].inicio).toBe(60_000);
  });
});

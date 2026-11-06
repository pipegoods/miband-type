import { describe, expect, it } from "vitest";
import { parseHeartRate } from "./parseHeartRate";

const dv = (...bytes: number[]) => new DataView(new Uint8Array(bytes).buffer);

describe("parseHeartRate (0x2A37)", () => {
  it("HR uint8 sin RR (como la Xiaomi Smart Band)", () => {
    expect(parseHeartRate(dv(0x00, 72))).toEqual({
      bpm: 72,
      contacto: null,
      energia: null,
      rr: [],
    });
  });

  it("HR uint8 con dos RR en 1/1024 s", () => {
    const m = parseHeartRate(dv(0x10, 60, 0x00, 0x04, 0x00, 0x02));
    expect(m.bpm).toBe(60);
    expect(m.rr).toEqual([1000, 500]);
  });

  it("HR uint16 + energía + RR", () => {
    const m = parseHeartRate(dv(0x19, 0x48, 0x00, 0x10, 0x00, 0x00, 0x04));
    expect(m).toEqual({ bpm: 72, contacto: null, energia: 16, rr: [1000] });
  });

  it("estado de contacto", () => {
    expect(parseHeartRate(dv(0x06, 70)).contacto).toBe(true);
    expect(parseHeartRate(dv(0x04, 70)).contacto).toBe(false);
  });
});

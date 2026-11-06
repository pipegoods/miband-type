/**
 * Decodifica la característica estándar Heart Rate Measurement (0x2A37)
 * según la especificación Bluetooth SIG (Heart Rate Service 1.0).
 *
 * Byte 0 = flags:
 *   bit 0    → formato del valor HR: 0 = uint8, 1 = uint16
 *   bit 1-2  → estado de contacto del sensor
 *   bit 3    → presente el campo Energy Expended (uint16)
 *   bit 4    → presentes uno o más intervalos RR (uint16, resolución 1/1024 s)
 */
export interface HeartRateMeasurement {
  bpm: number;
  /** null si el sensor no reporta contacto. */
  contacto: boolean | null;
  energia: number | null;
  /** Intervalos RR en milisegundos. */
  rr: number[];
}

export function parseHeartRate(data: DataView): HeartRateMeasurement {
  const flags = data.getUint8(0);
  const hr16 = (flags & 0x01) !== 0;
  const contactoSoportado = (flags & 0x04) !== 0;
  const contactoDetectado = (flags & 0x02) !== 0;
  const tieneEnergia = (flags & 0x08) !== 0;
  const tieneRR = (flags & 0x10) !== 0;

  let offset = 1;
  let bpm: number;
  if (hr16) {
    bpm = data.getUint16(offset, true);
    offset += 2;
  } else {
    bpm = data.getUint8(offset);
    offset += 1;
  }

  let energia: number | null = null;
  if (tieneEnergia) {
    energia = data.getUint16(offset, true);
    offset += 2;
  }

  const rr: number[] = [];
  if (tieneRR) {
    while (offset + 1 < data.byteLength) {
      const raw = data.getUint16(offset, true);
      rr.push(Math.round((raw * 1000) / 1024));
      offset += 2;
    }
  }

  return {
    bpm,
    contacto: contactoSoportado ? contactoDetectado : null,
    energia,
    rr,
  };
}

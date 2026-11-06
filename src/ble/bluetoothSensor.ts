import { parseHeartRate } from "./parseHeartRate";
import type { HrSource, HrSourceCallbacks } from "./source";

export const bluetoothDisponible = () =>
  typeof navigator !== "undefined" && "bluetooth" in navigator;

/**
 * Conecta con cualquier dispositivo que exponga el Heart Rate Service estándar (0x180D):
 * - Xiaomi Smart Band 8/9/10 con “Transmisión de frecuencia cardíaca” activada
 *   (Ajustes → Frecuencia cardíaca → Transmisión). No requiere auth key.
 * - Bandas de pecho (Polar H10, Garmin HRM, Wahoo TICKR…), que además envían RR.
 *
 * Web Bluetooth funciona en Chrome/Edge (escritorio y Android) bajo HTTPS o localhost.
 */
export async function conectarSensor(cb: HrSourceCallbacks): Promise<HrSource> {
  if (!bluetoothDisponible()) {
    throw new Error(
      "Este navegador no soporta Web Bluetooth. Usa Chrome o Edge en escritorio o Android.",
    );
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ["heart_rate"] }],
  });

  const onDisconnect = () => cb.onDesconectado();
  device.addEventListener("gattserverdisconnected", onDisconnect);

  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService("heart_rate");
  const char = await service.getCharacteristic("heart_rate_measurement");

  const onValue = (e: Event) => {
    const value = (e.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    const m = parseHeartRate(value);
    cb.onSample({ t: Date.now(), bpm: m.bpm, rr: m.rr });
  };
  char.addEventListener("characteristicvaluechanged", onValue);
  await char.startNotifications();

  return {
    nombre: device.name ?? "Sensor BLE",
    async detener() {
      char.removeEventListener("characteristicvaluechanged", onValue);
      device.removeEventListener("gattserverdisconnected", onDisconnect);
      try {
        await char.stopNotifications();
      } catch {
        // El dispositivo pudo haberse desconectado ya.
      }
      device.gatt?.disconnect();
    },
  };
}

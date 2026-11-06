import { Dexie, type EntityTable } from "dexie";
import type { HrSample } from "../hrv/types";

export interface Sesion {
  id?: number;
  actividad: string;
  dispositivo: string;
  inicio: number;
  fin: number | null;
  muestras: number;
}

export interface MuestraGuardada extends HrSample {
  id?: number;
  sesionId: number;
}

/** Almacenamiento local en el navegador (IndexedDB). Nada sale del dispositivo. */
export const db = new Dexie("hrv-estres") as Dexie & {
  sesiones: EntityTable<Sesion, "id">;
  muestras: EntityTable<MuestraGuardada, "id">;
};

db.version(1).stores({
  sesiones: "++id, inicio",
  muestras: "++id, sesionId, t",
});

export async function crearSesion(actividad: string, dispositivo: string) {
  return (await db.sesiones.add({
    actividad,
    dispositivo,
    inicio: Date.now(),
    fin: null,
    muestras: 0,
  })) as number;
}

export async function guardarMuestras(sesionId: number, muestras: HrSample[]) {
  if (muestras.length === 0) return;
  await db.transaction("rw", db.muestras, db.sesiones, async () => {
    await db.muestras.bulkAdd(muestras.map((m) => ({ ...m, sesionId })));
    await db.sesiones
      .where("id")
      .equals(sesionId)
      .modify((s) => {
        s.muestras += muestras.length;
      });
  });
}

export async function cerrarSesion(sesionId: number) {
  await db.sesiones.update(sesionId, { fin: Date.now() });
}

export async function muestrasDeSesion(sesionId: number): Promise<HrSample[]> {
  const ms = await db.muestras.where("sesionId").equals(sesionId).sortBy("t");
  return ms.map(({ t, bpm, rr }) => ({ t, bpm, rr }));
}

export async function borrarSesion(sesionId: number) {
  await db.transaction("rw", db.muestras, db.sesiones, async () => {
    await db.muestras.where("sesionId").equals(sesionId).delete();
    await db.sesiones.delete(sesionId);
  });
}

/** Formato de intercambio JSON: una sesión con sus muestras crudas. */
export interface SesionExportada {
  formato: "hrv-estres/1";
  sesion: Omit<Sesion, "id">;
  muestras: HrSample[];
}

export async function importarSesion(datos: SesionExportada) {
  if (datos.formato !== "hrv-estres/1") throw new Error("Archivo no reconocido");
  const id = (await db.sesiones.add({ ...datos.sesion, muestras: 0 })) as number;
  await guardarMuestras(id, datos.muestras);
  return id;
}

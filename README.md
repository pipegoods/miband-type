# Variabilidad cardíaca e índice de estrés (2026)

Aplicación web para registrar la frecuencia cardíaca desde una pulsera o banda Bluetooth y
calcular la **variabilidad de la frecuencia cardíaca (HRV)** y el **índice de estrés de
Baevsky**.

Esta es la versión rehecha (noviembre de 2026) de mi tesis de 2021, que usaba una Xiaomi Mi
Band 4/5. La versión original está en la rama `master`.

## Requisitos

- Node.js 20 o superior
- Chrome o Edge (escritorio o Android). Safari y Firefox no soportan Web Bluetooth.
- Un sensor compatible con el **Heart Rate Service** estándar de Bluetooth:
  - **Xiaomi Smart Band 8/9/10**: activa *Ajustes → Frecuencia cardíaca → Transmisión de
    frecuencia cardíaca*. No necesita auth key.
  - **Bandas de pecho** (Polar H10, Garmin HRM, Wahoo TICKR…): envían intervalos RR reales.
- Sin sensor puedes usar el **simulador** incluido.

## Uso

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # pruebas del cálculo de HRV y del parser BLE
npm run build
```

## Qué calcula

| Métrica | Descripción |
| --- | --- |
| SI de Baevsky | `AMo / (2 · Mo · MxDMn)` con histograma de 50 ms |
| SDNN, RMSSD, pNN50 | Dominio del tiempo (Task Force 1996) |
| LF, HF, LF/HF | Spline cúbico a 4 Hz, Hann, FFT (ventanas ≥ 2 min) |

Los RR fuera de 300–2000 ms o que se desvían más de 20 % de la mediana local se descartan como
artefactos. El análisis se hace por ventanas de 1, 2 o 5 min, con umbrales configurables
(por defecto los de la tesis: < 40 relajado, 40–150 normal, ≥ 150 estresado).

## RR reales y RR aproximados

El cálculo de HRV necesita intervalos RR **latido a latido**. Si el sensor los envía (bandas
de pecho), la sesión se marca como **RR reales**. Si solo envía BPM, que es el caso probable de
la Xiaomi Smart Band, los RR se aproximan como `60000 / BPM` y la sesión se marca como **HRV
aproximado**. Así funcionaba la versión de 2021, y la variabilidad queda subestimada.

## Datos

Todo se guarda localmente en el navegador (IndexedDB). Cada sesión se puede exportar como:

- **RR (CSV)**: tacograma para Kubios HRV, R o Excel
- **Ventanas (CSV)**: métricas por ventana
- **Sesión (JSON)**: datos crudos, que se pueden volver a importar

## Estructura

```
src/
  ble/       parser 0x2A37, conexión Web Bluetooth, simulador
  hrv/       métricas (tiempo, Baevsky, frecuencia), series y ventanas (+ pruebas)
  storage/   IndexedDB (Dexie) y exportación
  components/ interfaz (Medir, Sesiones, Detalle, Método)
```

Stack: Vite, React 19, TypeScript, Recharts, Dexie, Vitest.

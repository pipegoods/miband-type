export default function Metodo() {
  return (
    <article className="card prosa">
      <h2>Método</h2>

      <h3>1. Adquisición</h3>
      <p>
        La app se conecta por Web Bluetooth al <b>Heart Rate Service</b> estándar (0x180D) y se
        suscribe a la característica <b>Heart Rate Measurement</b> (0x2A37). Cada notificación
        trae la frecuencia cardíaca y, si el sensor lo soporta, uno o más intervalos RR en
        unidades de 1/1024 s.
      </p>
      <p>
        La Xiaomi Smart Band 10 expone este servicio con la opción “Transmisión de frecuencia
        cardíaca”, sin necesidad de auth key. Si no envía RR, la app los aproxima como
        60000 / BPM y marca la sesión como <i>HRV aproximado</i>.
      </p>

      <h3>2. Preprocesamiento</h3>
      <ul>
        <li>Se descartan RR fuera de 300–2000 ms (30–200 lpm).</li>
        <li>
          Se descartan RR que se desvían más de 20 % de la mediana de sus 10 vecinos (latidos
          ectópicos o pérdidas de señal).
        </li>
        <li>Con RR reales, los latidos se ubican en el tiempo por suma acumulada.</li>
      </ul>

      <h3>3. Índice de estrés de Baevsky</h3>
      <p className="formula">SI = AMo / (2 · Mo · MxDMn)</p>
      <ul>
        <li>
          <b>Mo</b> (s): centro de la clase más poblada del histograma de RR con clases de 50 ms.
        </li>
        <li>
          <b>AMo</b> (%): porcentaje de RR que cae en esa clase.
        </li>
        <li>
          <b>MxDMn</b> (s): RRmax − RRmin.
        </li>
      </ul>
      <p>
        Clasificación (umbrales de la tesis original, configurables): SI &lt; 40 relajado,
        40–150 normal, ≥ 150 estresado.
      </p>

      <h3>4. Otras métricas</h3>
      <ul>
        <li>
          <b>SDNN</b>: desviación estándar de los RR.
        </li>
        <li>
          <b>RMSSD</b>: raíz de la media de los cuadrados de las diferencias sucesivas (actividad
          vagal).
        </li>
        <li>
          <b>pNN50</b>: % de diferencias sucesivas mayores a 50 ms.
        </li>
        <li>
          <b>LF / HF</b>: tacograma remuestreado a 4 Hz con spline cúbico, sin tendencia lineal,
          ventana de Hann y FFT. LF 0.04–0.15 Hz, HF 0.15–0.40 Hz. Se requieren ≥ 2 min.
        </li>
      </ul>

      <h3>5. Cambios respecto a la versión de 2021</h3>
      <ul>
        <li>
          La versión original calculaba RR = 60000 / BPM con la Mi Band 4/5, que solo entrega BPM
          promediado. Ahora se usan RR reales cuando el sensor los envía.
        </li>
        <li>
          La moda se calculaba sobre valores exactos; ahora se usa el histograma de 50 ms del
          método de Baevsky.
        </li>
        <li>
          Se agregan filtrado de artefactos, SDNN, RMSSD, pNN50, análisis espectral y exportación
          para Kubios / R / Excel.
        </li>
        <li>Ya no se necesita la auth key ni el protocolo propietario de Xiaomi.</li>
      </ul>

      <h3>Referencias</h3>
      <ol className="refs">
        <li>
          Baevsky R.M., Chernikova A.G. (2017). Heart rate variability analysis: physiological
          foundations and main methods. <i>Cardiometry</i>, 10, 66–76.
        </li>
        <li>
          Task Force of the ESC and NASPE (1996). Heart rate variability: standards of
          measurement, physiological interpretation and clinical use. <i>Circulation</i>, 93(5),
          1043–1065.
        </li>
        <li>
          Shaffer F., Ginsberg J.P. (2017). An overview of heart rate variability metrics and
          norms. <i>Frontiers in Public Health</i>, 5, 258.
        </li>
        <li>Bluetooth SIG. Heart Rate Service Specification 1.0.</li>
      </ol>
    </article>
  );
}

import React, { useState, ChangeEvent, useEffect } from "react";
import {
  Button,
  Divider,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from "@material-ui/core";
import MiBand5 from "./lib/miband";
import firebase from "./config/firebase";
import ChartsComponent from "./ChartsComponent";
import firebaseapp from "firebase";
import * as MathJS from "mathjs";
import ChartsComponentIDM from "./ChartsComponentIDM";

interface RegistroType {
  rr: number;
  bpm: number;
  id: string;
  createdAt: firebaseapp.firestore.Timestamp;
}

export interface RegistroTypeString {
  rr: number;
  bpm: number;
  id: string;
  createdAt: string;
}

declare global {
  interface Window {
    miband: MiBand5 | undefined;
  }
}

export interface RegistroIntervalo {
  listaRR: number[];
  idm: number;
  is: number;
  hora: string;
}

function App() {
  const initResgistroInter: RegistroIntervalo[] = [
    {
      idm: 0,
      is: 0,
      listaRR: [],
      hora: "Hora"
    },
  ];

  const [registro, setregistro] = useState<RegistroType[]>([]);
  const [registroIntervalo, setregistroIntervalo] =
    useState<RegistroIntervalo[]>(initResgistroInter);
  const [listRegistros, setlistRegistros] = useState<string[]>([]);
  const [registroSelect, setRegistroSelect] = useState<string>("");
  const [bpm, setBpm] = useState<number>(0);
  const [rr, setrr] = useState<number>(0);
  const [authKey, setauthKey] = useState<string>(
    "a574867c6e7d9cc0b4e705fecb1189a2"
  );
  const [nombreActividad, setnombreActividad] = useState<string>(
    "Correr al aire libre"
  );

  const [stateMiband, setstateMiband] = useState<boolean>(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setauthKey(event.target.value);
  };

  const handleChangeNombre = (event: ChangeEvent<HTMLInputElement>) => {
    setnombreActividad(event.target.value);
  };

  const handleChangeSelect = (event: React.ChangeEvent<{ value: unknown }>) => {
    setRegistroSelect(event.target.value as string);
  };

  const obteneRegistros = () => {
    try {
      console.log("ENTREEEE");

      firebase.db
        .collection("registroRR")
        .doc(registroSelect)
        .collection("registro")
        .orderBy("createdAt")
        .onSnapshot((querySnapshot) => {
          setregistro([]);
          querySnapshot.docs.forEach((doc) => {
            const { bpm, rr, createdAt } = doc.data();
            setregistro((old) => [...old, { bpm, rr, id: doc.id, createdAt }]);
          });
        });
      setregistroIntervalo(calcularIDM(separarIntervalos(registro)));
    } catch (error) {}
  };

  const calcularModa = (arrProps: RegistroType[]) => {
    return MathJS.mode(listadoRR(arrProps));
  };

  const calcularModaRR = (arrProps: number[]) => {
    return MathJS.mode(arrProps);
  };

  const conectar = async () => {
    console.log("Estoy conectando!!");
    let doc_id = "";
    firebase.db
      .collection("registroRR")
      .add({
        nombreActividad,
        createdAt: firebase.firebase.firestore.FieldValue.serverTimestamp(),
      })
      .then((doc) => {
        doc_id = doc.id;
      });

    window.addEventListener("heartrate", (e: CustomEventInit) => {
      console.log("BPM ACTUAL:", e.detail);
      console.log("RR:", 60000 / e.detail);
      setBpm(e.detail);
      setrr(60000 / e.detail);

      firebase.db
        .collection("registroRR")
        .doc(doc_id)
        .collection("registro")
        .add({
          rr: Math.trunc(60000 / e.detail),
          bpm: e.detail,
          createdAt: firebase.firebase.firestore.FieldValue.serverTimestamp(),
        });

      // rr: 60000 / e.detail,
      //   bpm: e.detail,
    });

    try {
      window.miband = new MiBand5(authKey);
      await window.miband.init();
      setstateMiband(true);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const desconectar = async () => {
    console.log(window.miband);

    try {
      await window.miband?.onDisconnectButtonClick();
      setstateMiband(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  useEffect(() => {
    try {
      setlistRegistros([]);
      firebase.db.collection("registroRR").onSnapshot((querySnapshot) => {
        querySnapshot.docs.forEach((doc) => {
          // const { bpm, rr, createdAt } = doc.data();
          // setregistro((old) => [...old, { bpm, rr, id: doc.id, createdAt }]);
          console.log(doc.data());
          setlistRegistros((old) => [...old, doc.id]);
        });
      });
    } catch (error) {
      console.log(error);
    }
  }, []);

  const listadoRR = (arrProps: RegistroType[]) => {
    const arr = arrProps.slice();
    return arr.map((a) => a.rr);
  };

  const arrayMin = (arrProps: RegistroType[]) => {
    return Math.min.apply(Math, listadoRR(arrProps));
  };

  const arrayMinRR = (arrProps: number[]) => {
    return Math.min.apply(Math, arrProps);
  };

  const arrayMax = (arrProps: RegistroType[]) => {
    return Math.max.apply(Math, listadoRR(arrProps));
  };

  const arrayMaxRR = (arrProps: number[]) => {
    return Math.max.apply(Math, arrProps);
  };

  const timestamptodate = (arrProps: RegistroType[]) => {
    const arr = arrProps.slice();
    const arrReturn: RegistroTypeString[] = [];
    arr.forEach((a) => {
      const date = a.createdAt.toDate();

      // Minutes
      var minutes = "0" + date.getMinutes();

      // Seconds
      var seconds = "0" + date.getSeconds();
      arrReturn.push({
        rr: a.rr,
        bpm: a.bpm,
        id: a.id,
        createdAt: minutes.substr(-2) + ":" + seconds.substr(-2),
      });
    });
    return arrReturn;
  };

  const modaaaa = () => {
    console.log(calcularModa(registro)[0]);
    const moda = calcularModa(registro)[0];
    console.log(`numero de registros: ${registro.length}`);
    console.log("MAX: ", arrayMax(registro));
    console.log("MIN: ", arrayMin(registro));

    if (moda) {
      const porModa =
        (registro.filter((r) => r.rr === moda).length / registro.length) * 100;
      const maxArrayRR = arrayMax(registro) / 1000;
      const minArrayRR = arrayMin(registro) / 1000;

      console.log("%moda: ", porModa);
      console.log("2M: ", (2 * moda) / 1000);
      console.log("RRMax - RRMin: ", maxArrayRR - minArrayRR);

      const idm = porModa / (((2 * moda) / 1000) * (maxArrayRR - minArrayRR));
      console.log("Indice de estres mental: ", idm);
      alert(`El indice de estres es: ${idm}`);
    }

    console.log(calcularIDM(separarIntervalos(registro)));
    setregistroIntervalo(calcularIDM(separarIntervalos(registro)));
  };

  const agregaMinutos = (dt: Date, minutos: number) => {
    return new Date(dt.getTime() + minutos * 60000);
  };

  const separarIntervalos = (arrProps: RegistroType[]) => {
    const arr = arrProps.slice();
    const arrReturn: RegistroIntervalo[] = [];
    let ultimoDate: Date = agregaMinutos(arr[0].createdAt.toDate(), 1);
    let arrRR: number[] = [];
    let bandera: boolean = false;
    arr.forEach((registro) => {
      if (registro.createdAt.toDate() <= ultimoDate) {
        arrRR.push(registro.rr);
      } else {
        bandera = true;
        arrReturn.push({ idm: 0, listaRR: arrRR, hora: registro.createdAt.toDate().getHours() + ":" + registro.createdAt.toDate().getMinutes() + ":" + registro.createdAt.toDate().getSeconds(), is: 0 });
        arrRR = [];
        ultimoDate = agregaMinutos(registro.createdAt.toDate(), 1);
      }
    });

    if (!bandera) {
      arrReturn.push({ idm: 0, listaRR: arrRR, hora: registro[0].createdAt.toDate().toString(), is: 0 });
    }

    return arrReturn;
  };

  const calcularIDM = (arrProps: RegistroIntervalo[]) => {
    const arr = arrProps.slice();
    let moda: number;
    let min;
    let max;
    let porModa;
    arr.forEach((registro) => {
      if (registro.listaRR.length > 0) {
        moda = calcularModaRR(registro.listaRR)[0];
        min = arrayMinRR(registro.listaRR) / 1000;
        max = arrayMaxRR(registro.listaRR) / 1000;
        porModa =
          (registro.listaRR.filter((r) => r === moda).length /
            registro.listaRR.length) *
          100;
        registro.idm = porModa / (((2 * moda) / 1000) * (max - min));
        if (registro.idm < 40) {
          registro.is = 1 // Relajado
        } else if (registro.idm >= 40 && registro.idm < 150) {
          registro.is = 2 // Normal
        } else {
          registro.is = 3 // Estresado
        }
      }
    });

    return arr;
  };

  return (
    <div>
      <Typography variant="h1" color="initial">{`BPM: ${bpm}`}</Typography>
      <Typography variant="h1" color="initial">{`RR: ${rr}`}</Typography>
      <Divider />
      <br />
      <TextField
        label="Nombre de la actividad"
        value={nombreActividad}
        onChange={handleChangeNombre}
        fullWidth
      />
      <br />
      <br />
      <TextField
        label="Auth Key de la Mi Band"
        value={authKey}
        onChange={handleChange}
        fullWidth
      />
      <br />
      <br />
      {!stateMiband ? (
        <Button variant="contained" onClick={conectar}>
          conectar
        </Button>
      ) : (
        <Button color="secondary" variant="contained" onClick={desconectar}>
          desconectar
        </Button>
      )}
      <br />
      <Button onClick={modaaaa} variant="contained" color="primary">
        CALCULAR IEM
      </Button>
      <br />

      <Divider />
      <br />
      <Button onClick={obteneRegistros} variant="outlined" color="secondary">
        Obtener!!
      </Button>

      <FormControl>
        <InputLabel id="demo-simple-select-label">Registro!</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={registroSelect}
          onChange={handleChangeSelect}
        >
          {listRegistros.map((r) => {
            return (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      {registro.length ? (
        <Grid
          container
          spacing={1}
          direction="row"
          justify="center"
          alignItems="center"
          alignContent="center"
          wrap="nowrap"
        >
          <Grid item xs={6}>
            <ChartsComponent
              datos={timestamptodate(registro)}
              argumentField="createdAt"
              valueField="rr"
              name="Registro RR"
            />
          </Grid>
          <Grid item xs={6}>
            <ChartsComponent
              datos={timestamptodate(registro)}
              argumentField="createdAt"
              valueField="bpm"
              name="Registro BPM"
            />
          </Grid>
          <Grid item xs={12}>
            <ChartsComponentIDM
              datos={registroIntervalo}
              argumentField="hora"
              valueField="idm"
              name="IDM Cada 2 Minutos"
            />
          </Grid>
          <Grid item xs={12}>
            <ChartsComponent
              datos={registroIntervalo}
              argumentField="hora"
              valueField="is"
              name="Indice, 1: Relajado, 2: Normal, 3: Estresado"
            />
          </Grid>
        </Grid>
      ) : null}
      <br />

      <ul>
        {registro.map((r) => {
          return (
            <li key={r.id}>{`BPM: ${r.bpm}, RR: ${r.rr}, Fecha: ${agregaMinutos(
              r.createdAt.toDate(),
              1
            ).toUTCString()}`}</li>
          );
        })}
      </ul>
    </div>
  );
}

export default App;

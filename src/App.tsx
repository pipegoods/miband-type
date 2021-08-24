import React, { useState, ChangeEvent, useEffect } from "react";
import { Button, Divider, Typography, TextField, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from "@material-ui/core";
import MiBand5 from "./lib/miband";
import firebase from "./config/firebase";

interface RegistroType {
  rr: number;
  bpm: number;
  id: string;
  createdAt: any;
}

declare global {
  interface Window {
    miband: MiBand5 | undefined;
  }
}

function App() {
  const [registro, setregistro] = useState<RegistroType[]>([]);
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

  const calcularModa = (arr: RegistroType[]) => {
    return arr
      .sort(
        (a, b) =>
          arr.filter((v) => v.rr === a.rr).length -
          arr.filter((v) => v.rr === b.rr).length
      )
      .pop();
  };

  const handleChangeSelect = (event: SelectChangeEvent<{ value: string }>) => {
    setRegistroSelect(event.target.value.toString());

    try {
      console.log("ENTREEEE");
      
      firebase.db.collection("registrosRR").doc(event.target.value.toString()).collection("registro").onSnapshot((querySnapshot) => {
        setregistro([]);
        querySnapshot.docs.forEach((doc) => {
          const { bpm, rr, createdAt } = doc.data();
          setregistro((old) => [...old, { bpm, rr, id: doc.id, createdAt }]);
        });
      });
    } catch (error) {
      
    }
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
          rr: 60000 / e.detail,
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
    } catch (e) {
      alert(e.message);
    }
  };

  const desconectar = async () => {
    console.log(window.miband);

    try {
      await window.miband?.onDisconnectButtonClick();
      setstateMiband(false);
    } catch (e) {
      alert(e.message);
    }
  };

  useEffect(() => {
    try {
      firebase.db
        .collection("registroRR")
        .onSnapshot((querySnapshot) => {
          setregistro([]);
          querySnapshot.docs.forEach((doc) => {
            // const { bpm, rr, createdAt } = doc.data();
            // setregistro((old) => [...old, { bpm, rr, id: doc.id, createdAt }]);
            console.log(doc.data());
            setlistRegistros((old) => [...old, doc.id])
          });
        });
    } catch (error) {
      console.log(error);
    }

  }, []);

  const modaaaa = () => {
    console.log(calcularModa(registro)?.rr);
    console.log(`numero de registros: ${registro.length}`);
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
      <Button onClick={modaaaa} variant="contained" color="success">
        moda
      </Button>
      <br />

      <Divider />
      <FormControl fullWidth>
        <InputLabel id="demo-simple-select-label">Escoge el registro</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={{value: registroSelect}}
          label="Age"
          onChange={handleChangeSelect}
        >
          {
            listRegistros.map(r => {
              return (
                <MenuItem value={r}>{r}</MenuItem>
              )
            })
          }
        </Select>
      </FormControl>
      <br />
      <br />
      <ul>
        {registro.map((r) => {
          return (
            <li key={r.id}>{`BPM: ${r.bpm}, RR: ${
              r.rr
            }, fehca: ${r.createdAt.toDate()}`}</li>
          );
        })}
      </ul>
    </div>
  );
}

export default App;

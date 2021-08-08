import React, { useState, ChangeEvent, useEffect } from "react";
import { Button, Divider, Typography, TextField } from "@material-ui/core";
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
  const [bpm, setBpm] = useState<number>(0);
  const [rr, setrr] = useState<number>(0);
  const [authKey, setauthKey] = useState<string>(
    "a574867c6e7d9cc0b4e705fecb1189a2"
  );

  const [stateMiband, setstateMiband] = useState<boolean>(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setauthKey(event.target.value);
  };

  const conectar = async () => {
    console.log("Estoy conectando!!");

    window.addEventListener("heartrate", (e: CustomEventInit) => {
      console.log("BPM ACTUAL:", e.detail);
      console.log("RR:", 60000 / e.detail);
      setBpm(e.detail);
      setrr(60000 / e.detail);

      firebase.db.collection("registroRR").add({
        rr: 60000 / e.detail,
        bpm: e.detail,
        createdAt: firebase.firebase.firestore.FieldValue.serverTimestamp(),
      });
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
        .orderBy("createdAt")
        .onSnapshot((querySnapshot) => {
          setregistro([]);
          querySnapshot.docs.forEach((doc) => {
            const { bpm, rr, createdAt } = doc.data();
            setregistro((old) => [...old, { bpm, rr, id: doc.id, createdAt }]);
          });
        });
    } catch (error) {
      console.log(error);
    }
  }, []);

  return (
    <div>
      <Typography variant="h1" color="initial">{`BPM: ${bpm}`}</Typography>
      <Typography variant="h1" color="initial">{`RR: ${rr}`}</Typography>
      <Divider />
      <br />
      <TextField
        label="Auth Key de la Mi Band"
        value={authKey}
        onChange={handleChange}
        fullWidth
      />
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
      <br />
      <Divider />
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

import firebase from "firebase/app";
import 'firebase/firestore';

const config = {
  apiKey: "AIzaSyCEt7wQMELHqkU1An52xb90VMRX6ZeYBwY",
  authDomain: "miband-estres.firebaseapp.com",
  projectId: "miband-estres",
  storageBucket: "miband-estres.appspot.com",
  messagingSenderId: "713828226134",
  appId: "1:713828226134:web:c7997574ef764a347657f7",
};

firebase.initializeApp(config);
const db = firebase.firestore();

const f = {
    firebase,
    db
}

export default f;
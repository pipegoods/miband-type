import { ADVERTISEMENT_SERVICE, CHAR_UUIDS, UUIDS } from "./constants";
import AESJS from './aes.js'

function buf2hex(buffer : ArrayBuffer) {
  return Array.prototype.map
    .call(new Uint8Array(buffer), (x) => ("00" + x.toString(16)).slice(-2))
    .join("");
}

const concatBuffers = (buffer1 : ArrayBuffer, buffer2 : ArrayBuffer) => {
  const out = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  out.set(new Uint8Array(buffer1), 0);
  out.set(new Uint8Array(buffer2), buffer1.byteLength);
  return out.buffer;
};

export class MiBand5 {
  /**
   * @param {String} authKey
   *   Hex representation of the auth key (https://github.com/Freeyourgadget/Gadgetbridge/wiki/Huami-Server-Pairing)
   *   Example: '94359d5b8b092e1286a43cfb62ee7923'
   */

    authKey: string;
    services: {
        miband1 : BluetoothRemoteGATTService | undefined,
        miband2 : BluetoothRemoteGATTService | undefined,
        heartrate : BluetoothRemoteGATTService | undefined
    };
    chars: {
        auth: BluetoothRemoteGATTCharacteristic | undefined,
        hrControl: BluetoothRemoteGATTCharacteristic | undefined,
        hrMeasure: BluetoothRemoteGATTCharacteristic | undefined,
        sensor: BluetoothRemoteGATTCharacteristic | undefined
    };
    device: BluetoothDevice | undefined;
    hrmTimer: any;

  constructor(authKey : string) {
    if (!authKey.match(/^[a-zA-Z0-9]{32}$/)) {
      throw new Error(
        "Invalid auth key, must be 32 hex characters such as '94359d5b8b092e1286a43cfb62ee7923'"
      );
    }
    this.authKey = authKey;
    this.services = {
        miband1 : undefined,
        miband2 : undefined,
        heartrate : undefined
    };
    this.chars = {
        auth: undefined,
        hrControl: undefined,
        hrMeasure: undefined,
        sensor: undefined
    };
    this.device = undefined;
  }

  async init() {
    this.device = undefined;
    this.device = await navigator.bluetooth.requestDevice({
      filters: [
        {
          services: [ADVERTISEMENT_SERVICE],
        },
      ],
      optionalServices: [UUIDS.miband2, UUIDS.heartrate, UUIDS.miband1],
    });
    window.dispatchEvent(new CustomEvent("connected"));
    this.device.gatt?.disconnect();
    const server = await this.connect();
    console.log("Conectado a través de gatt");

    this.services.miband1 = await server?.getPrimaryService(UUIDS.miband1);
    this.services.miband2 = await server?.getPrimaryService(UUIDS.miband2);
    this.services.heartrate = await server?.getPrimaryService(UUIDS.heartrate);
    console.log("Servicios inicializados");

    this.chars.auth = await this.services.miband2?.getCharacteristic(
      CHAR_UUIDS.auth
    );
    this.chars.hrControl = await this.services.heartrate?.getCharacteristic(
      CHAR_UUIDS.heartrate_control
    );
    this.chars.hrMeasure = await this.services.heartrate?.getCharacteristic(
      CHAR_UUIDS.heartrate_measure
    );
    this.chars.sensor = await this.services.miband1?.getCharacteristic(
      CHAR_UUIDS.sensor
    );
    console.log("Características inicializadas");
    await this.authenticate();
  }

  async connect() {
    console.log("Connecting to Bluetooth Device...");
    if (this.device) {
        return this.device.gatt?.connect();
    }
  }

  async authenticate() {
    await this.startNotifications(this.chars.auth, async (e : any) => {
      const value = e.target.value.buffer;
      const cmd = buf2hex(value.slice(0, 3));
      if (cmd === "100101") {
        console.log("Set new key OK");
      } else if (cmd === "100201") {
        const number = value.slice(3);
        console.log(
          "Reto de autenticación recibido: ",
          buf2hex(value.slice(3))
        );
        const key = AESJS.utils.hex.toBytes(this.authKey);
        const aesCbc = new AESJS.ModeOfOperation.cbc(key);
        const out = aesCbc.encrypt(new Uint8Array(number));
        const cmd = concatBuffers(new Uint8Array([3, 0]), out);
        console.log("Envío de la respuesta de autenticación");
        await this.chars.auth?.writeValue(cmd);
      } else if (cmd === "100301") {
        await this.onAuthenticated();
      } else if (cmd === "100308") {
        console.log("Fallo de autentificación recibido");
      } else {
        throw new Error(`Unknown callback, cmd='${cmd}'`);
      }
    });
    await this.chars.auth?.writeValue(Uint8Array.from([2, 0]));
  }

  async onAuthenticated() {
    console.log("Autenticación exitosa");
    window.dispatchEvent(new CustomEvent("authenticated"));
    await this.measureHr();
  }

  async measureHr() {
    console.log("Starting heart rate measurement");
    await this.chars.hrControl?.writeValue(Uint8Array.from([0x15, 0x02, 0x00]));
    await this.chars.hrControl?.writeValue(Uint8Array.from([0x15, 0x01, 0x00]));
    await this.startNotifications(this.chars.hrMeasure, (e : any) => {
      console.log("Valor de la frecuencia cardíaca recibida: ", e.target.value);
      const heartRate = e.target.value.getInt16();
      window.dispatchEvent(
        new CustomEvent("heartrate", {
          detail: heartRate,
        })
      );
    });
    await this.chars.hrControl?.writeValue(Uint8Array.from([0x15, 0x01, 0x01]));

    // Start pinging HRM

    this.hrmTimer =
      this.hrmTimer ||
      setInterval(() => {
        if (this.device && this.device.gatt?.connected) {
          console.log("Pinging monitor de frecuencia cardíaca");
          this.chars.hrControl?.writeValue(Uint8Array.from([0x16]));
        }
      }, 12000);
  }

  async startNotifications(char : BluetoothRemoteGATTCharacteristic | undefined, cb : any) {
    await char?.startNotifications();
    char?.addEventListener("characteristicvaluechanged", cb);
  }

  async onDisconnectButtonClick() {
    if (!this.device) {
      return;
    }
    console.log("Disconnecting from Bluetooth Device...");
    if (this.device.gatt?.connected) {
      console.log("BlueThoot conectado!!");
      this.device.gatt.disconnect();
    } else {
      console.log("> Bluetooth Device is already disconnected");
    }
  }

//   async onReconnectButtonClick() {
//     if (!this.device) {
//       return;
//     }
//     if (this.device.gatt.connected) {
//       console.log('> Bluetooth Device is already connected');
//       return;
//     }
//     this.connect().then(() => console.log(this.device))
//     .catch(error => {
//       console.log('Argh! ' + error);
//     });
//   }
}

export default MiBand5;

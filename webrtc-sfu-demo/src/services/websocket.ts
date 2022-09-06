import { EventEmitter } from '@/services/Emitter';
import { WebSocketParams, SendData } from '@/services/type';
import { v4 } from 'uuid';
import { logger } from '@/util/logger';

interface In_Flight_Send {
  resolve: any;
  reject: any;
}

export class Socket extends EventEmitter {
  _disconnected: boolean = true;
  _socket?: WebSocket;
  _baseUrl?: string;
  _in_flight_send?: Map<string, In_Flight_Send> = new Map();

  constructor({ url = undefined }: WebSocketParams) {
    super();
    this._baseUrl = url;
  }

  start(): void {
    const wsUrl = this._baseUrl!;

    if (!!this._socket || !this._disconnected) {
      return;
    }
    this._socket = new WebSocket(wsUrl);

    this._disconnected = false;

    this._socket.onclose = (e) => {
      console.log('ws is closed!');
    };
    this._socket.onopen = (e) => {
      console.log('ws is connecting!');
      this.emit('connecting');
    };
    this._socket.onmessage = this._handleOnMessage.bind(this);
    // this._socket.onmessage = (event: any) => {
    //   let data;
    //   try {
    //     data = JSON.parse(event.data);
    //   } catch (e) {
    //     return;
    //   }
    //   this.emit('Message', data);
    // };
  }

  _handleOnMessage(e: any) {
    let _data;
    try {
      _data = JSON.parse(e.data);
    } catch (e) {
      return;
    }
    const { id, type, data } = _data;
    const { resolve, reject } = this._in_flight_send?.get(id)!;
    resolve({ type, data });
    this._in_flight_send?.delete(id);
  }

  close() {
    this._socket?.close();
  }

  sendData(sendData: SendData): Promise<any> {
    const id = ((sendData as any).id = v4());
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this._in_flight_send?.set(id, { resolve, reject });
    this._socket?.send(JSON.stringify(sendData));
    return promise;
  }
}

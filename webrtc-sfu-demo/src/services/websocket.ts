import { EventEmitter } from '@/services/Emitter';
import { WebSocketParams, SendData } from '@/services/type';

// (WebSocket.prototype as any).sendData = function ({ data, type }: SendData) {
//   (this as any).send(JSON.stringify({ data, type }));
// };

export class Socket extends EventEmitter {
  _disconnected: boolean = true;
  _socket?: WebSocket;
  _baseUrl?: string;

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
    this._socket.onmessage = (event: any) => {
      let data;
      try {
        data = JSON.parse(event.data);
        console.log('Server message received:', data);
      } catch (e) {
        console.log('Invalid server message', event.data);
        return;
      }
      this.emit('Message', data);
    };
  }

  close() {
    this._socket?.close();
  }

  sendData({ data, type }: SendData): void {
    if (this._disconnected) {
      return;
    }
    this._socket?.send(JSON.stringify({ data, type }));
  }
}

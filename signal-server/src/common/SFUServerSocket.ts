const WebSocket = require('ws');
const { v4 } = require('uuid');
const { EventEmitter } = require('../util/emitter');

export class SFUServerSocket extends EventEmitter {
  private roomId?: string;
  constructor(ip: string, port: string) {
    super();
    this.id = `${ip}:${port}`;
    this.ip = ip;
    this.port = port;
    this._disconnected = true;
    this.socket;
    this.in_flight_send = new Map();
  }

  start(roomId: string) {
    if (!!this.socket || !this._disconnected) {
      return;
    }
    return new Promise((resolve: any, reject: any) => {
      this.roomId = roomId;
      this.socket = new WebSocket(`wss://${this.ip}:${this.port}/?room_id=${roomId}`);
      this._disconnected = false;

      this._socketHandler();
      this.on('open', () => {
        resolve();
      });
    });
  }

  _socketHandler() {
    this.socket.on('open', () => {
      console.log('ServerSocket is connecting with port: [%s], roomId: [%s]!', this.id, this.roomId);
      this.emit('open');
    });
    this.socket.on('close', () => {
      console.log('ServerSocket %s is closed!', this.id);
    });
    this.socket.onmessage = this._onMessageHandler.bind(this);
  }

  _onMessageHandler(event: any) {
    const { id, data } = JSON.parse(event.data);
    const { resolve, reject } = this.in_flight_send.get(id);
    resolve(data);
    this.in_flight_send.delete(id);
  }

  sendData({ data, type }: { data: any; type: string }): Promise<any> {
    const id = v4();
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.in_flight_send.set(id, { resolve, reject });
    this.socket?.send(JSON.stringify({ id, data, type }));
    return promise;
  }
}

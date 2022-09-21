const WebSocket = require('ws');
const { v4 } = require('uuid');
const { EventEmitter } = require('../util/emitter');

interface SendData {
  data: {};
  type: string;
}

export class SFUServerSocket extends EventEmitter {
  private roomId?: string;
  constructor(ip: string, port: string) {
    super();
    this.id = `${ip}:${port}`;
    this.ip = ip;
    this.port = port;
    this._disconnected = true;
    this._socket;
    this._in_flight_send = new Map();
  }

  start(roomId: string) {
    if (!!this._socket || !this._disconnected) {
      return;
    }
    return new Promise((resolve: any, reject: any) => {
      this.roomId = roomId;
      this._socket = new WebSocket(`wss://${this.ip}:${this.port}/?room_id=${roomId}`);
      this._disconnected = false;

      this._socketHandler();
      this.on('open', () => {
        resolve();
      });
    });
  }

  _socketHandler() {
    this._socket.on('open', () => {
      console.log('ServerSocket is connecting with port: [%s], roomId: [%s]!', this.id, this.roomId);
      this.emit('open');
    });
    this._socket.on('close', () => {
      console.log('ServerSocket %s is closed!', this.id);
    });
    // this._socket.onmessage = this._onMessageHandler.bind(this);
    this._socket.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      const { messageType, ...rest } = data;
      switch (messageType) {
        case 'request':
          this._handlerRequest(rest);
          break;
        case 'response':
          this._handlerResponse(rest);
          break;
        case 'notification':
          this._handlerNotification(rest);
          break;
      }
    };
  }

  // _onMessageHandler(event: any) {
  //   const { id, data } = JSON.parse(event.data);
  //   const { resolve, reject } = this.in_flight_send.get(id);
  //   resolve(data);
  //   this.in_flight_send.delete(id);
  // }

  // sendData({ data, type }: { data: any; type: string }): Promise<any> {
  //   const id = v4();
  //   let resolve, reject;
  //   const promise = new Promise((res, rej) => {
  //     resolve = res;
  //     reject = rej;
  //   });
  //   this.in_flight_send.set(id, { resolve, reject });
  //   this._socket?.send(JSON.stringify({ id, data, type }));
  //   return promise;
  // }
  _handlerRequest(_data: any) {}

  _handlerResponse(_data: any) {
    const { id, type, data } = _data;
    const { resolve, reject } = this._in_flight_send?.get(id)!;
    resolve({ type, data });
    this._in_flight_send?.delete(id);
  }

  _handlerNotification(_data: any) {
    this.emit('notification', _data);
  }

  notify(sendData: SendData): void {
    (sendData as any).messageType = 'notification';
    this._socket?.send(JSON.stringify(sendData));
  }

  request(sendData: SendData): Promise<any> {
    const id = ((sendData as any).id = v4());
    (sendData as any).messageType = 'request';
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

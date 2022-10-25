import { Log } from '../util/Log';

const WebSocket = require('ws');
const { v4 } = require('uuid');
const { EventEmitter } = require('../util/emitter');

interface SendData {
  data: {};
  type: string;
}

export class SFUServerSocket extends EventEmitter {
  private _id: string;
  private roomId: string;

  private log: Log = Log.GetInstance();
  constructor(ip: string, port: string, roomId: string) {
    super();
    this._id = `${ip}:${port}`;
    this.ip = ip;
    this.port = port;
    this.roomId = roomId;
    this._disconnected = true;
    this._socket;
    this._in_flight_send = new Map();
  }

  get id() {
    return this._id;
  }

  start() {
    try {
      if (!!this._socket || !this._disconnected) {
        return;
      }
      return new Promise((resolve: any, reject: any) => {
        this._socket = new WebSocket(`wss://${this.ip}:${this.port}/?room_id=${this.roomId}`);
        this._disconnected = false;

        this._socketHandler();
        this.on('open', () => {
          resolve();
        });
      });
    } catch (e: any) {
      this.log.error(e.message);
    }
  }
  sendData(sendData: any) {
    this._socket?.send(JSON.stringify({ ...sendData }));
  }

  _socketHandler() {
    this._socket.on('open', () => {
      console.log('ServerSocket is connecting with port: [%s], roomId: [%s]!', this.id, this.roomId);
      this.emit('open');
    });
    this._socket.on('close', () => {
      console.log('ServerSocket %s is closed!', this.id);
      this.emit('close', `${this.ip}:${this.port}:${this.roomId}`);
    });
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
  _handlerRequest(request: any) {
    this.emit('request', request, (sendData: any) => {
      sendData.messageType = 'response';
      sendData.id = request.id;
      this.sendData(sendData);
    });
  }

  _handlerResponse(response: any) {
    const { id, data } = response;
    const { resolve, reject } = this._in_flight_send?.get(id)!;
    resolve({ data });
    this._in_flight_send?.delete(id);
  }

  _handlerNotification(notification: any) {
    this.emit('notification', notification);
  }

  notify(sendData: SendData): void {
    (sendData as any).messageType = 'notification';
    this.sendData(sendData);
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
    this.sendData(sendData);
    return promise;
  }
}

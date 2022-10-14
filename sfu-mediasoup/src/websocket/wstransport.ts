import { v4 } from 'uuid';
import WebSocket from 'ws';
import { EventEmitter } from '../emitter/emitter';

export class WSTransport extends EventEmitter {
  private _socket: WebSocket;
  private _in_flight_send: Map<string, any>;

  constructor(socket: WebSocket) {
    super();

    this._socket = socket;
    this._in_flight_send = new Map();

    this._handleScoketConnection();
  }
  sendData(data: any) {
    this._socket.send(JSON.stringify({ ...data }));
  }

  _handleScoketConnection() {
    this._socket.on('close', (code: number, reason: Buffer) => {
      this._socket.close();
    });
    this._socket.on('message', (message: any) => {
      const jsonMessage = JSON.parse(message);
      const { messageType, ...rest } = jsonMessage;
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
    });
  }

  _handlerRequest(request: any) {
    this.emit('request', request, (sendData: any) => {
      sendData.messageType = 'response';
      sendData.id = request.id;
      this.sendData(sendData);
    });
  }
  _handlerResponse(response: any) {
    const { id, type, data } = response;
    const { resolve, reject } = this._in_flight_send?.get(id)!;
    resolve({ type, data });
    this._in_flight_send?.delete(id);
  }

  _handlerNotification(notification: any) {
    this.emit('notification', notification, (sendData: any) => {
      sendData.messageType = 'notification';
      this.sendData(sendData);
    });
  }

  notify(sendData: any) {
    sendData.messageType = 'notification';
    this.sendData(sendData);
  }

  request(sendData: any) {
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

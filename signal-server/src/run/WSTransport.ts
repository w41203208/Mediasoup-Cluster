import WebSocket from 'ws';
import { EventEmitter } from '../util/emitter';

export class WSTransport extends EventEmitter {
  private _socket: WebSocket;

  constructor(socket: WebSocket) {
    super();

    this._socket = socket;

    this._handleSocketConnection();
  }
  sendData(data: any) {
    this._socket.send(JSON.stringify({ ...data }));
  }

  _handleSocketConnection() {
    this._socket.on('close', (code: number, reason: Buffer) => { });
    this._socket.on('message', (message: any) => {
      const jsonMessage = JSON.parse(message);
      const { messageType, ...rest } = jsonMessage;
      switch (messageType) {
        case 'request':
          this._handlerRequest(rest);
          break;
        case 'response':
          this._handlerResponse();
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
  _handlerResponse() { }
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

  close() {
    this._socket.close();
  }
}
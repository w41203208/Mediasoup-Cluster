import WebSocket from 'ws';
import { EventEmitter } from '../util/emitter';

require('dotenv').config();

export class WSTransport extends EventEmitter {
  private _socket: WebSocket | null;

  constructor(socket: WebSocket) {
    super();

    this._socket = socket;

    this._handleSocketConnection();
  }
  sendData(data: any) {
    this._socket!.send(JSON.stringify({ ...data }));
  }

  _handleSocketConnection() {
    this._socket!.on('close', () => {
      console.log('socket is closed');
    });
    this._socket!.on('message', (message: any) => {
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
  _handlerResponse() {}
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
    console.log('To close socket');
    this._socket!.close();

    this._socket = null;
  }
}

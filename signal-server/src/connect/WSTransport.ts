import WebSocket from 'ws';
import { EventEmitter } from '../util/emitter';

require('dotenv').config();

export class WSTransport extends EventEmitter {
  private _socket: WebSocket;

  constructor(socket: WebSocket) {
    super();

    this._socket = socket;

    this._handleSocketConnection();
  }
  sendData(data: any) {
    if (Number(process.env.PORT) === 9998) {
      console.log(data);
    }
    this._socket.send(JSON.stringify({ ...data }));
  }

  _handleSocketConnection() {
    this._socket.on('close', (code: number, reason: Buffer) => {
      this._socket.close();
    });
    this._socket.on('message', (message: any) => {
      const jsonMessage = JSON.parse(message);
      if (Number(process.env.PORT) === 9998) {
        console.log(jsonMessage);
      }

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
    this._socket.close();
  }
}

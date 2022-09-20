import WebSocket from 'ws';
import { EventEmitter } from '../util/emitter';
import { HeartBeat } from '../type';

export class WSTransport extends EventEmitter {
  private _socket: WebSocket;

  constructor(socket: WebSocket) {
    super();

    this._socket = socket;

    this._handleScoketConnection();
  }
  sendData(data: any) {
    this._socket.send(JSON.stringify({ ...data }));
  }

  _handleScoketConnection() {
    this.heartCheck().reset().start();

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

  heartCheck() {
    const EVENT_FROM_SERVER_REQUEST = {
      HEART_BEAT_CHECK: 'heartBeatCheck',
    };
    const that = this;
    const heartCheck: HeartBeat = {
      timeout: 10 * 1000,
      timeoutObj: null,
      serverTimeoutObj: null,
      reset() {
        if (this.timeoutObj) clearTimeout(this.timeoutObj);
        if (this.serverTimeoutObj) clearTimeout(this.serverTimeoutObj);
        return this;
      },
      start() {
        const self = this;
        this.timeoutObj = setTimeout(() => {
          that.notify({
            type: EVENT_FROM_SERVER_REQUEST.HEART_BEAT_CHECK,
            data: 'ping',
          });
          self.serverTimeoutObj = setTimeout(() => {
            that._socket.close();
            // serverHandleLeaveRoom(peer);
            // console.log(`${peer.id} is close`);
          }, self.timeout);
        }, this.timeout);
      },
    };
    return heartCheck;
  }
}

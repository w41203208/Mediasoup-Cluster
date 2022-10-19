import { EventEmitter } from '../emitter';
import { Server } from 'https';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { WSTransport } from './wstransport';
const ws = require('ws');

export class WSServer extends EventEmitter {
  private _disconnected: boolean = true;
  private _socket?: WebSocketServer;
  constructor() {
    super();
  }

  get socket() {
    if (!!this._socket || !this._disconnected) {
      return;
    }
    return this._socket!;
  }

  start(server: Server): void {
    if (!!this._socket || !this._disconnected) {
      return;
    }
    const socket = (this._socket = new ws.Server({ server }));

    socket.on('open', () => {});
    socket.on('connection', (ws: WebSocket, incomingMessage: IncomingMessage) => {
      const url = this.urlParse(incomingMessage.url);
      this.emit(
        'connection',
        () => {
          const transport = new WSTransport(ws);
          return transport;
        },
        url
      );
    });
  }
  urlParse(url: string | undefined) {
    if (url === undefined) {
      return;
    }
    const matchAns = url.match(/\/?room_id=(\w*)/);
    if (!matchAns) {
      return;
    }
    const newUrl = matchAns[1];
    return newUrl;
  }
}

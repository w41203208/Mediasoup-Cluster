import { EventEmitter } from '../emitter';
import { Server } from 'https';
import { WebSocketServer, WebSocket } from 'ws';
import { Logger } from '../util/logger';
import { IncomingMessage } from 'http';
import { parse } from 'path';

const ws = require('ws');

export class WSServer extends EventEmitter {
  private _disconnected: boolean = true;
  private _socket?: WebSocketServer;

  private logger: Logger;
  constructor() {
    super();
    this.logger = new Logger();
  }

  get socket() {
    if (!!this._socket || !this._disconnected) {
      this.logger.info('Websocket is connected!');
      return;
    }
    return this._socket!;
  }

  start(server: Server): void {
    if (!!this._socket || !this._disconnected) {
      return;
    }
    const socket = (this._socket = new ws.Server({ server }));

    socket.on('open', () => {
      this.logger.info('Websocket is connected!');
    });
    socket.on('connection', (ws: WebSocket, incomingMessage: IncomingMessage) => {
      const url = this.urlParse(incomingMessage.url);
      this.emit('connection', ws, url);
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

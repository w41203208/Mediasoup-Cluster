import { EventEmitter } from '../emitter';
import { Server } from 'https';
import { WebSocketServer, WebSocket } from 'ws';
import { Logger } from '../util/logger';

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
    socket.on('connection', (ws: WebSocket) => {
      this.emit('connection', ws);
    });
  }
}

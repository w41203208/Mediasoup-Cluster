const ws = require('ws');
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'https';
import { WSTransport } from './WSTransport';

const { EventEmitter } = require('../util/emitter');

export class WSServer extends EventEmitter {
  private _wsServer?: WebSocketServer;
  constructor(httpsServer: Server) {
    super();
    const socket = (this._wsServer = new ws.Server({ server: httpsServer }));
    socket.on('open', () => {
      console.log('Websocket is connected');
    });
    socket.on('connection', (ws: WebSocket) => {
      console.log('Has Someone connected in!');
      this.emit('connection', () => {
        const transport = new WSTransport(ws);
        return transport;
      });
    });
  }
}

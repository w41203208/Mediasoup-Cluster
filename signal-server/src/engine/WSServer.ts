import { ServerImp } from './serverImp';
import { Server } from 'ws';

const { EventEmitter } = require('./emitter');

export class WSServer extends EventEmitter implements ServerImp {
  private _socket?: Server;
  constructor() {
    super();
  }

  get socket() {
    return this._socket;
  }
  _run(...args: any): void {
    const { server } = args;
    this._socket = new Server({ server });

    this._socket.on('open', () => {
      console.log('Websocket is connected');
    });
    this._socket.on('connection', (ws) => {
      this.emit('connection', ws);
    });
  }
}



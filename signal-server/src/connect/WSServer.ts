const ws = require('ws');
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'https';
import { WSTransport } from './WSTransport';
import { IncomingMessage } from 'http';
import { CryptoCore } from '../util/CryptoCore';

const { EventEmitter } = require('../util/emitter');

export class WSServer extends EventEmitter {
  private _wsServer?: WebSocketServer;
  private cryptoCore: CryptoCore;
  constructor(httpsServer: Server, cryptoCore: CryptoCore) {
    super();
    const socket = (this._wsServer = new ws.Server({ server: httpsServer }));
    this.cryptoCore = cryptoCore;
    socket.on('open', () => {
      console.log('Websocket is connected');
    });
    socket.on('connection', (ws: WebSocket, incomingMessage: IncomingMessage) => {
      try {
        const parameter = this.urlParse(incomingMessage.url);
        this.cryptoCore.decipherIv(parameter)
        console.log('Has Someone connected in!');
        this.emit('connection', () => {
          const transport = new WSTransport(ws);
          return transport;
        });
      } catch (err) {
        ws.close();
        console.log(err);
      }
    });
  }

  urlParse(url: string | undefined) {
    if (url === undefined) {
      return;
    }
    const matchAns = url.split('/?token=')
    if (!matchAns) {
      return;
    }
    const newUrl = matchAns[1];
    return newUrl;
  }
}

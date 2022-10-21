const ws = require('ws');
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'https';
import { WSTransport } from './WSTransport';
import { IncomingMessage } from 'http';
import { CryptoCore } from '../util/CryptoCore';
import { EventEmitter } from '../util/emitter';
import { urlParse } from '../util/tool';
import { Log } from '../util/Log';

export class WSServer extends EventEmitter {
  private cryptoCore: CryptoCore;

  private log: Log = Log.GetInstance();
  constructor(httpsServer: Server, cryptoCore: CryptoCore) {
    super();
    const socket = new ws.Server({ server: httpsServer });
    this.cryptoCore = cryptoCore;
    socket.on('open', () => {
      console.log('Websocket is connected');
    });
    socket.on('connection', (ws: WebSocket, incomingMessage: IncomingMessage) => {
      try {
        this.log.debug('Someone connect in this server!');
        if (!incomingMessage.url) {
          throw new Error('not get url');
        }
        const parameter = urlParse(incomingMessage.url, '/?token=([+/*<>=!#$%&"*+/=?^_~\'-\\w\\s\\d%]*)');

        if (!parameter) {
          throw new Error('not get token');
        }

        this.cryptoCore.decipherIv(parameter);
        this.emit('connection', parameter, () => {
          const transport = new WSTransport(ws);
          return transport;
        });
      } catch (err) {
        ws.close();
        console.log(err);
      }
    });
  }
}

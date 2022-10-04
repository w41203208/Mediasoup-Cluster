import express from 'express';
import cors from 'cors';
import { Application, Request, Response } from 'express';
import { createServer } from 'https';
import { ServerEngine } from 'src/engine';
import { HttpsServerOptions, sslOption } from '../type';
import bodyParser from 'body-parser';
import { CryptoCore } from '../util/CryptoCore';
import { IncomingMessage } from 'http';

export class HttpsServer {
  private _ip: string;
  private _port: number;
  private _ssl: sslOption;

  private app?: Application;
  private _listener: ServerEngine;
  private cryptoCore: CryptoCore;

  constructor({ ip, port, ssl }: HttpsServerOptions, listener: ServerEngine, cryptoCore: CryptoCore) {
    this._ip = ip;
    this._port = port;
    this._ssl = ssl;
    this._listener = listener;
    this.cryptoCore = cryptoCore;
  }

  run() {
    const app = express();
    app.use(cors());
    app.use(bodyParser.json());

    this.app = app;

    this._serverHandler();

    return this;
  }

  runToHttps() {
    const httpsServer = createServer(this._ssl, this.app);

    const server = httpsServer.listen(this._port, this._ip, () => {
      console.log(`Server is listening at https://${this._ip}:${this._port}`);
    });

    return server;
  }

  private _serverHandler() {
    if (this.app) {
      this.app.get('/new_sfu_server', (req: Request, res: Response) => {
        res.send(`${this._port}`);
      });
      this.app.get('/test', async (req: Request, res: Response) => {
        res.send('test');
      });
      this.app.get('/getUuid', (incomingMessage: IncomingMessage, res: Response) => {
        const parameter = this.urlParse(incomingMessage.url);
        const encrypted = this.cryptoCore.cipherIv(parameter!);
        res.send(JSON.stringify(encrypted));
      });
      this.app.get('/getRoomList', (incomingMessage: IncomingMessage, res: Response) => {
        try {
          const parameter = this.urlParse(incomingMessage.url);
          this.cryptoCore.decipherIv(parameter);
          const roomList: Array<any> = [];

          this._listener.roomList.forEach((values, keys) => {
            roomList.push({ 'roomId': keys, 'roomName': values.name, 'roomUserSize': values.getAllPeers().size })
          })

          res.send(JSON.stringify(roomList));
        } catch (e) {
          console.log(`${e}`);
          res.status(403).json({ e });
        }
      });
    }
  }

  urlParse(url: string | undefined) {
    if (url === undefined) {
      return;
    }
    const matchAns = url.split('/?id=')
    if (!matchAns) {
      return;
    }
    const newUrl = matchAns[1];
    return newUrl;
  }
}

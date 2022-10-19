import express from 'express';
import cors from 'cors';
import { Application, Request, Response } from 'express';
import { createServer } from 'https';
import { ServerEngine } from '../engine';
import { HttpsServerOptions, sslOption } from '../type.engine';
import bodyParser from 'body-parser';
import { CryptoCore } from '../util/CryptoCore';
import { IncomingMessage } from 'http';
import { Log } from '../util/Log';

export class HttpsServer {
  private _ip: string;
  private _port: number;
  private _ssl: sslOption;

  private app?: Application;
  private _listener: ServerEngine;
  private cryptoCore: CryptoCore;

  private log: Log = Log.GetInstance();

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
      this.log.info('Server is listening at https://%s:%s', this._ip, this._port);
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

          this._listener
            .getAllRoom()
            .then((response) => {
              return res.send(JSON.stringify(response));
            })
            .catch((err) => {
              console.log(err);
            });
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
    const matchAns = url.split('/?id=');
    if (!matchAns) {
      return;
    }
    const newUrl = matchAns[1];
    return newUrl;
  }
}

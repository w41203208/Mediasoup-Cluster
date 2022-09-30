import express from 'express';
import cors from 'cors';
import { Application, Request, Response } from 'express';
import { createServer } from 'https';
import { ServerEngine } from 'src/engine';
import { HttpsServerOptions, sslOption } from '../type';
import bodyParser from 'body-parser'
import { CryptoCore } from './CryptoCore';

export class HttpsServer {
  private _ip: string;
  private _port: number;
  private _ssl: sslOption;

  private app?: Application;
  private _listener: ServerEngine;
  public uuId: string;
  public cryptoCore: CryptoCore
  constructor({ ip, port, ssl }: HttpsServerOptions, listener: ServerEngine) {
    this._ip = ip;
    this._port = port;
    this._ssl = ssl;
    this.uuId = "";
    this.cryptoCore = new CryptoCore;
    this._listener = listener;
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
      // const iv = Crypto.randomBytes(12);
      // const key = process.env.CRYPTO_KEY!;
      // const cipherKey = Buffer.from(key, "hex");
      this.app.get('/new_sfu_server', (req: Request, res: Response) => {
        res.send(`${this._port}`);
      });
      this.app.get('/test', async (req: Request, res: Response) => {
        res.send('test');
      });
      this.app.get('/getUuid/:crypto', (req: Request, res: Response) => {
        const encrypted = this.cryptoCore.cipherIv(req.params.crypto)
        res.send(JSON.stringify(encrypted));
        this.uuId = encrypted;
      });
      this.app.post('/getRoomList', (req: Request, res: Response) => {
        try {
          const { uuId } = req.body;
          this.cryptoCore.decipherIv(uuId);
          const roomList: Array<any> = []

          this._listener.getRoomList.forEach((values, keys) => {
            console.log(keys)

            roomList.push({ 'roomId': keys, 'roomName': values.name })
          })
          res.send(JSON.stringify(roomList));
        } catch (e) {
          console.log(`${e}`);
          res.status(403).json({ e });
        }
      });
    }
  }
}

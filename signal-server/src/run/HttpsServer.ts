import { Application, Request, Response } from 'express';
import { createServer } from 'https';
import { ServerEngine } from 'src/engine';
import { HttpsServerOptions, sslOption } from '../type';

const express = require('express');
const cors = require('cors');

export class HttpsServer {
  private _ip: string;
  private _port: number;
  private _ssl: sslOption;

  private app?: Application;
  private _listener: ServerEngine;
  constructor({ ip, port, ssl }: HttpsServerOptions, listener: ServerEngine) {
    this._ip = ip;
    this._port = port;
    this._ssl = ssl;

    this._listener = listener;
  }

  run(...args: any) {
    const app = express();
    app.use(cors());

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
        res.send('testtest');
      });
      this.app.get('/test', async (req: Request, res: Response) => {
        res.send('test');
      });
    }
  }
}

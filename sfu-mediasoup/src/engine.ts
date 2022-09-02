import { Server, createServer } from 'https';
import { WebSocket } from 'ws';
import { WSServer } from './websocket/index';
import { Application, Request, Response } from 'express';
import { Worker, Router } from 'mediasoup/node/lib/types';
import { Logger } from './util/logger';
import { sslOption, EngineOptions, RouterOptions } from './type.engine';
import { v4 } from 'uuid';

const express = require('express');
const mediasoup = require('mediasoup');
const cors = require('cors');

export class ServerEngine {
  private _port: number;
  private _ssl: sslOption;
  private _numworker: number;
  private _nextMediasoupWorkerIdx: number = 0;

  private app?: Application;
  private webSocketConnection?: WSServer;
  private mediasoupWorkers: Array<Worker> = [];
  private logger: Logger = new Logger();
  private routersList: Map<string, Router> = new Map();

  constructor({ serverOption, mediasoupOption }: EngineOptions) {
    // server setting
    const { port, ssl } = serverOption;
    this._port = port || 3001;
    this._ssl = ssl;

    // mediasoup setting
    const { numWorkers } = mediasoupOption;
    this._numworker = numWorkers;
  }
  public async run() {
    await this._runMediasoupWorkers();

    // create express app
    this.app = this._runExpressApp();

    // https
    const server = this._runHttpsServer();
    //websocket
    this.webSocketConnection = new WSServer();

    this.webSocketConnection.start(server);

    this.webSocketConnection.on('connection', (ws: WebSocket) => {
      ws.on('message', (message: any) => {
        const { id, data, type } = JSON.parse(message);
        this._websocketHandler({ id, type, data, ws });
      });
    });
  }

  private _runExpressApp() {
    const app = express();
    app.use(express.json());
    app.use(cors());

    app.get('/', (req: Request, res: Response) => {
      res.send('testestestest');
    });

    return app;
  }

  private _runHttpsServer() {
    const httpsServer = createServer(this._ssl, this.app);

    const server = httpsServer.listen(this._port, '0.0.0.0', () => {
      console.log(`Server is listening at https://192.168.1.98:${this._port}`);
    });
    return server;
  }

  private async _runMediasoupWorkers() {
    this.logger.info(`Running ${this._numworker} mediasoup Workers....`);

    for (let i = 0; i < this._numworker; i++) {
      const worker = await mediasoup.createWorker({ logLevel: 'debug' });
      worker.on('@success', () => {
        this.logger.info(`Number ${i} mediasoup Worker is created`);
      });

      this.mediasoupWorkers.push(worker);
    }
  }
  private _getMediasoupWorkers() {
    const worker = this.mediasoupWorkers![this._nextMediasoupWorkerIdx];

    if (++this._nextMediasoupWorkerIdx === this.mediasoupWorkers!.length) this._nextMediasoupWorkerIdx = 0;

    return worker;
  }

  private _websocketHandler({
    id,
    type,
    data,
    ws,
  }: {
    id: string;
    type: string;
    data: Record<string, any>;
    ws: WebSocket;
  }) {
    switch (type) {
      case 'createRouter':
        console.log(data);
        ws.send(
          JSON.stringify({
            id: id,
            data: 'test',
          })
        );
        break;
    }
  }
}

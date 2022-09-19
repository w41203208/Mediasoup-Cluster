import { Server, createServer } from 'https';
import { WebSocket } from 'ws';
import { WSServer } from './websocket/index';
import { Application, Request, Response } from 'express';
import { Worker, Router, Transport, Consumer, Producer } from 'mediasoup/node/lib/types';
import { Logger } from './util/logger';
import { sslOption, EngineOptions, RouterOptions } from './type.engine';

import { Controllers, createRedisController } from './redis/index';
import { Room } from './room';

const express = require('express');
const mediasoup = require('mediasoup');
const cors = require('cors');

const EVENT_FOR_SFU = {
  CREATE_ROUTER: 'createRouter',
  GET_ROUTER_RTPCAPABILITIES: 'getRouterRtpCapabilities',
  CREATE_WEBRTCTRANSPORT: 'createWebRTCTransport',
  CONNECT_WEBRTCTRANPORT: 'connectWebRTCTransport',
  CREATE_CONSUME: 'createConsume',
  CREATE_PRODUCE: 'createProduce',
};

interface WebSocketHandler {
  id: string;
  type: string;
  data: Record<string, any> | any;
  ws: WebSocket;
}

interface Handler {
  id: string;
  data: Record<string, any> | any;
  ws: WebSocket;
}

export class ServerEngine {
  private _ip: string;
  private _port: number;
  private _ssl: sslOption;
  private _numworker: number;
  private _webRTCTransportSettings: Record<string, any>;
  private _workerSettings: Record<string, any>;

  private _nextMediasoupWorkerIdx: number = 0;

  private app?: Application;
  private webSocketConnection?: WSServer;
  private mediasoupWorkers: Array<Worker> = [];
  private redisControllers?: Record<string, any>;
  private logger: Logger = new Logger();

  private _rooms: Map<string, Room>;

  constructor({ serverOption, mediasoupOption }: EngineOptions) {
    // server setting
    const { ip, port, ssl } = serverOption;
    this._ip = ip;
    this._port = port || 3001;
    this._ssl = ssl;

    // mediasoup setting
    const { numWorkers, webRtcTransportSettings, workerSettings } = mediasoupOption;
    this._numworker = numWorkers;
    this._webRTCTransportSettings = webRtcTransportSettings;
    this._workerSettings = workerSettings;

    this._rooms = new Map();
  }
  public async run() {
    this.redisControllers = await createRedisController(Controllers);

    await this._runMediasoupWorkers();

    // create express app
    this.app = this._runExpressApp();

    // https
    const server = this._runHttpsServer();

    //websocket
    this.webSocketConnection = new WSServer();

    this.webSocketConnection.on('connection', (ws: WebSocket, url: string) => {
      const room = this.getRoomOrCreateRoom(url);

      room.handleConnection(ws);
    });

    this.webSocketConnection.start(server);

    this.redisControllers?.SFUServerController.setSFUServer(`${process.env.MEDIASOUP_ANNOUNCED_IP}:${this._port}`);
  }

  private _runExpressApp() {
    const app = express();
    app.use(express.json());
    app.use(cors());

    app.get('/', (req: Request, res: Response) => {
      res.send('testestestest11111');
    });

    return app;
  }

  private _runHttpsServer() {
    const httpsServer = createServer(this._ssl, this.app);

    const server = httpsServer.listen(this._port, this._ip, () => {
      console.log(`Server is listening at https://${this._ip}:${this._port}`);
    });
    return server;
  }

  private async _runMediasoupWorkers() {
    this.logger.info(`Running ${this._numworker} mediasoup Workers....`);

    for (let i = 0; i < this._numworker; i++) {
      console.log(this._workerSettings.rtcMinPort);
      console.log(this._workerSettings.rtcMaxPort);
      const worker = await mediasoup.createWorker({
        logLevel: this._workerSettings.logLevel,
        logTags: this._workerSettings.logTags,
        rtcMinPort: Number(this._workerSettings.rtcMinPort),
        rtcMaxPort: Number(this._workerSettings.rtcMaxPort),
      });
      worker.on('@success', () => {
        this.logger.info(`Number ${i} mediasoup Worker is created`);
      });

      this.mediasoupWorkers.push(worker);
    }
  }
  _getMediasoupWorkers(): Worker {
    const worker = this.mediasoupWorkers![this._nextMediasoupWorkerIdx];

    if (++this._nextMediasoupWorkerIdx === this.mediasoupWorkers!.length) this._nextMediasoupWorkerIdx = 0;

    return worker;
  }

  private getRoomOrCreateRoom(id: string): Room {
    let room: Room;
    if (this._rooms.has(id)) {
      room = this._rooms.get(id)!;
    } else {
      room = new Room(id, this, this._webRTCTransportSettings);
    }
    this._rooms.set(room.id, room);
    return room;
  }
}

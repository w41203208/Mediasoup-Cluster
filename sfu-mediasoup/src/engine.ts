import { Server, createServer } from 'https';
import { WebSocket } from 'ws';
import { WSServer } from './websocket/index';
import { Application, Request, Response } from 'express';
import { Worker, Router, Transport, Consumer, Producer } from 'mediasoup/node/lib/types';
import { sslOption, EngineOptions, RouterOptions, RedisClientOptions } from './type.engine';

import { RedisClient } from './redis/redis';
import { Room } from './room';
import { ControllerFactory } from './redis/ControllerFactory';

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

export class ServerEngine {
  // redis settings
  private _redisClientOption: RedisClientOptions;

  // server settings
  private _ip: string;
  private _port: number;
  private _ssl: sslOption;

  // mediasoup settings
  private _numworker: number;
  private _webRTCTransportSettings: Record<string, any>;
  private _workerSettings: Record<string, any>;
  private _pipeTransportSettings: Record<string, any>;

  // attributes
  private _nextMediasoupWorkerIdx: number = 0;

  // objects
  private app?: Application;
  private webSocketConnection?: WSServer;
  private mediasoupWorkers: Array<Worker> = [];
  private redisControllers?: Record<string, any>;
  private _rooms: Map<string, Room>;
  private redisClient?: RedisClient;
  private _controllerFactory?: ControllerFactory;

  constructor({ serverOption, mediasoupOption, redisClientOption }: EngineOptions) {
    // server setting
    const { ip, port, ssl } = serverOption;
    this._ip = ip;
    this._port = port || 3001;
    this._ssl = ssl;

    // redis setting
    this._redisClientOption = redisClientOption;

    // mediasoup setting
    const { numWorkers, webRtcTransportSettings, workerSettings, pipeTransportSettings } = mediasoupOption;
    this._numworker = numWorkers;
    this._webRTCTransportSettings = webRtcTransportSettings;
    this._pipeTransportSettings = pipeTransportSettings;
    this._workerSettings = workerSettings;

    this._rooms = new Map();
  }
  public async run() {
    this.redisClient = RedisClient.GetInstance(this._redisClientOption);
    this._controllerFactory = ControllerFactory.GetInstance(this.redisClient);

    await this._runMediasoupWorkers();

    // create express app
    this.app = this._runExpressApp();

    // https
    const server = this._runHttpsServer();

    //websocket
    this.webSocketConnection = new WSServer();

    this.webSocketConnection.on('connection', (getWsTransport: Function, url: string) => {
      const room = this.getRoomOrCreateRoom(url);

      const transport = getWsTransport();

      room.handleConnection(transport);
    });

    this.webSocketConnection.start(server);

    const sfuControoler = this._controllerFactory.getControler('SFU');

    sfuControoler!.setSFUServer(`${process.env.DOMAIN}:${this._port}`);
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
    for (let i = 0; i < this._numworker; i++) {
      const worker: Worker = await mediasoup.createWorker({
        logLevel: this._workerSettings.logLevel,
        logTags: this._workerSettings.logTags,
        rtcMinPort: Number(this._workerSettings.rtcMinPort),
        rtcMaxPort: Number(this._workerSettings.rtcMaxPort),
      });
      worker.on('@success', () => {});

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
      room = new Room({
        id: id,
        listener: this,
        webRTCTransportSettings: this._webRTCTransportSettings,
        pipeTransportSettings: this._pipeTransportSettings,
      });
    }
    this._rooms.set(room.id, room);
    return room;
  }
}

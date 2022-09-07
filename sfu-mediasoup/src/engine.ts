import { Server, createServer } from 'https';
import { WebSocket } from 'ws';
import { WSServer } from './websocket/index';
import { Application, Request, Response } from 'express';
import { Worker, Router, Transport, Consumer, Producer } from 'mediasoup/node/lib/types';
import { Logger } from './util/logger';
import { sslOption, EngineOptions, RouterOptions } from './type.engine';
import { v4 } from 'uuid';

const express = require('express');
const mediasoup = require('mediasoup');
const cors = require('cors');

const EVENT_FOR_SFU = {
  CREATE_ROUTER: 'createRouter',
  GET_ROUTER_RTPCAPABILITIES: 'getRouterRtpCapabilities',
  CREATE_WEBRTCTRANSPORT: 'createWebRTCTransport',
  CONNECT_WEBRTCTRANPORT: 'connectWebRTCTransport',
  CREATE_CONSUME: 'createConsume',
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
  private _port: number;
  private _ssl: sslOption;
  private _numworker: number;
  private _webRTCTransportSettings: Record<string, any>;
  private _workerSettings: Record<string, any>;

  private _nextMediasoupWorkerIdx: number = 0;

  private app?: Application;
  private webSocketConnection?: WSServer;
  private mediasoupWorkers: Array<Worker> = [];
  private logger: Logger = new Logger();
  private _routersList: Map<string, Router>;
  private _transportList: Map<string, Transport>;
  private _consumerList: Map<string, Consumer>;
  private _producerList: Map<string, Producer>;

  constructor({ serverOption, mediasoupOption }: EngineOptions) {
    // server setting
    const { port, ssl } = serverOption;
    this._port = port || 3001;
    this._ssl = ssl;

    // mediasoup setting
    const { numWorkers, webRtcTransportSettings, workerSettings } = mediasoupOption;
    this._numworker = numWorkers;
    this._webRTCTransportSettings = webRtcTransportSettings;
    this._workerSettings = workerSettings;
    this._routersList = new Map();
    this._transportList = new Map();
    this._consumerList = new Map();
    this._producerList = new Map();
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
      const worker = await mediasoup.createWorker(this._workerSettings);
      worker.on('@success', () => {
        this.logger.info(`Number ${i} mediasoup Worker is created`);
      });

      this.mediasoupWorkers.push(worker);
    }
  }
  private _getMediasoupWorkers(): Worker {
    const worker = this.mediasoupWorkers![this._nextMediasoupWorkerIdx];

    if (++this._nextMediasoupWorkerIdx === this.mediasoupWorkers!.length) this._nextMediasoupWorkerIdx = 0;

    return worker;
  }

  private _websocketHandler({ id, type, data, ws }: WebSocketHandler) {
    switch (type) {
      case EVENT_FOR_SFU.CREATE_ROUTER:
        this.createRouterHandler({ id, data, ws });
        break;
      case EVENT_FOR_SFU.GET_ROUTER_RTPCAPABILITIES:
        this.getRouterRtpCapabilities({ id, data, ws });
        break;
      case EVENT_FOR_SFU.CREATE_WEBRTCTRANSPORT:
        this.createWebRTCTransport({ id, data, ws });
        break;
      case EVENT_FOR_SFU.CONNECT_WEBRTCTRANPORT:
        this.connectWebRTCTranport({ id, data, ws });
        break;
      case EVENT_FOR_SFU.CREATE_CONSUME:
        this.createConsume({ id, data, ws });
        break;
    }
  }

  private async createRouterHandler({ id, data, ws }: Handler) {
    const { mediaCodecs } = data;
    const worker = this._getMediasoupWorkers();
    const router = await worker.createRouter({ mediaCodecs });
    this._routersList.set(router.id, router);
    ws.send(
      JSON.stringify({
        id: id,
        data: {
          router_id: router.id,
        },
      })
    );
  }

  private getRouterRtpCapabilities({ id, data, ws }: Handler) {
    const { router_id } = data;
    if (!this._routersList.has(router_id)) {
      return;
    }
    ws.send(
      JSON.stringify({
        id: id,
        data: {
          mediaCodecs: this._routersList.get(router_id)?.rtpCapabilities,
        },
      })
    );
  }

  private async createWebRTCTransport({ id, data, ws }: Handler) {
    const { router_id, producing, consuming } = data;

    if (!this._routersList.has(router_id)) {
      return;
    }
    const router = this._routersList.get(router_id);

    const { maxIncomingBitrate, initialAvailableOutgoingBitrate, listenIps } = this._webRTCTransportSettings;
    const transport = await router!.createWebRtcTransport({
      listenIps: listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate,
      appData: {
        producing: producing,
        consuming: consuming,
      },
    });

    if (maxIncomingBitrate) {
      try {
        await transport.setMaxIncomingBitrate(maxIncomingBitrate);
      } catch (error) {
        console.log(error);
      }
    }
    /* Register transport listen event */
    transport.on('@close', () => {});
    transport.on('dtlsstatechange', () => {});

    this._transportList.set(transport.id, transport);

    ws.send(
      JSON.stringify({
        id: id,
        data: {
          transport_id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
          transportType: transport.appData.consuming === true ? 'consuming' : 'producing',
        },
      })
    );
  }

  private async connectWebRTCTranport({ id, data, ws }: Handler) {
    const { router_id, transport_id, dtlsParameters } = data;
    const transport = this._transportList.get(transport_id);
    await transport?.connect({
      dtlsParameters: dtlsParameters,
    });
    console.log('test');
    ws.send(
      JSON.stringify({
        id: id,
        data: 'Successfully',
      })
    );
  }

  private async createConsume({ id, data, ws }: Handler) {
    const { router_id, tranport_id, rtpCapabilities, producers } = data;
    const router = this._routersList.get(router_id);
    const transport = this._transportList.get(tranport_id);

    if (router === undefined || transport === undefined) {
      return;
    }

    let new_consumerList = {};
    for (let { producer } of producers) {
      if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
        console.error('can not consume');
        return;
      }
      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities: rtpCapabilities,
      });

      /* Register Consumer listen event */
      consumer.on('transportclose', () => {
        console.log('Consumer transport close', { consumer_id: `${consumer.id}` });
        this._consumerList.delete(consumer.id);
      });

      this._consumerList.set(consumer.id, consumer);

      (new_consumerList as any)[consumer.id] = {
        id: consumer.id,
        producer_id: producer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };
    }

    ws.send(
      JSON.stringify({
        id: id,
        data: {
          new_consumerList: new_consumerList,
        },
      })
    );
  }
}

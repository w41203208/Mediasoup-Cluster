import { Router, Transport, Consumer, Producer, PipeTransport } from 'mediasoup/node/lib/types';
import { ServerEngine } from './engine';
import { WSTransport } from './websocket/wstransport';
import { Log } from './util/Log';
import { ErrorHandler, ErrorHandlerFunc } from './util/Error';

const EVENT_FROM_SIGNAL = {
  CREATE_ROUTER: 'createRouter',
  GET_ROUTER_RTPCAPABILITIES: 'getRouterRtpCapabilities',
  CREATE_WEBRTCTRANSPORT: 'createWebRTCTransport',
  CONNECT_WEBRTCTRANPORT: 'connectWebRTCTransport',
  CREATE_CONSUME: 'createConsume',
  CREATE_PRODUCE: 'createProduce',
  CREATE_PIPETRANSPORT: 'createPipeTransport',
  CONNECT_PIPETRANSPORT: 'connectPipeTransport',
  CREATE_PIPETRANSPORT_PRODUCE: 'createPipeTransportProduce',
  CREATE_PIPETRANSPORT_CONSUME: 'createPipeTransportConsume',
  CREATE_PLAINTRANSPORT: 'createPlainTransport',
  SET_PREFERRED_LAYERS: "setPreferredLayers",
  CLOSE_TRANSPORT: 'closeTransport',
};

interface WebSocketHandler {
  ws: WSTransport;
  type: string;
  data: Record<string, any> | any;
  response: Function;
}

interface Handler {
  ws: WSTransport;
  data: Record<string, any> | any;
  response: Function;
}

interface RoomConstructorInterface {
  id: string;
  listener: ServerEngine;
  webRTCTransportSettings: Record<string, any>;
  pipeTransportSettings: Record<string, any>;
}

export class Room implements ErrorHandler {
  private _id: string;
  private _listener: ServerEngine;
  private _routers: Map<string, Router>;
  private _pipeTransportsRouter?: Router;
  private _transports: Map<string, Transport>;
  private _pipeTransports: Map<string, PipeTransport>;
  private _consumers: Map<string, Consumer>;
  private _producers: Map<string, Producer>;

  private _webRTCTransportSettings: Record<string, any>;
  private _pipeTransportSettings: Record<string, any>;

  /**
   * 儲存這個room有跟哪些其他 sfu server 建立連線了
   * key = ip:port
   * value = pipeTransport.id
   */
  private _serverAndPipeTransport: Map<string, string>;

  /**
   * 儲存這個 producer 紀錄已經 pipeToRouter 過
   */
  private _alreadyPipeToRouterProudcer: Map<string, string>;

  private log: Log = Log.GetInstance();

  constructor({ id, listener, webRTCTransportSettings, pipeTransportSettings }: RoomConstructorInterface) {
    this._id = id;
    this._listener = listener;
    this._routers = new Map();
    this._transports = new Map();
    this._consumers = new Map();
    this._producers = new Map();

    this._pipeTransports = new Map();
    this._pipeTransportsRouter;
    this._serverAndPipeTransport = new Map();
    this._alreadyPipeToRouterProudcer = new Map();

    this._webRTCTransportSettings = webRTCTransportSettings;
    this._pipeTransportSettings = pipeTransportSettings;
  }

  get id() {
    return this._id;
  }

  handleConnection(ws: WSTransport) {
    ws.on('request', (message: { type: string; data: any }, response: Function) => {
      const { type, data } = message;
      this._websocketHandler({ ws, type, data, response });
    });
    // ws.on('message', (message: any) => {
    //   const { id, data, type } = JSON.parse(message);
    //   this._websocketHandler({ id, type, data, ws });
    // });
  }
  private _websocketHandler({ ws, type, data, response }: WebSocketHandler) {
    switch (type) {
      case EVENT_FROM_SIGNAL.CREATE_ROUTER:
        this.createRouterHandler({ ws, data, response });
        break;
      case EVENT_FROM_SIGNAL.GET_ROUTER_RTPCAPABILITIES:
        this.getRouterRtpCapabilitiesHandler({ ws, data, response });
        break;
      case EVENT_FROM_SIGNAL.CREATE_WEBRTCTRANSPORT:
        this.createWebRTCTransportHandler({ ws, data, response });
        break;
      case EVENT_FROM_SIGNAL.CONNECT_WEBRTCTRANPORT:
        this.connectWebRTCTranportHandler({ ws, data, response });
        break;
      case EVENT_FROM_SIGNAL.CREATE_CONSUME:
        this.createConsumeHandler({ ws, data, response });
        break;
      case EVENT_FROM_SIGNAL.CREATE_PRODUCE:
        this.createProduceHandler({ ws, data, response });
        break;
      case EVENT_FROM_SIGNAL.CREATE_PIPETRANSPORT:
        this.createPipeTransportHandler({ ws, data, response });
        break;
      case EVENT_FROM_SIGNAL.CONNECT_PIPETRANSPORT:
        this.connectPipeTransportHandler({ ws, data, response });
        break;
      case EVENT_FROM_SIGNAL.CREATE_PIPETRANSPORT_PRODUCE:
        this.createPipeTransportProduceHandler({ ws, data, response });
        break;
      case EVENT_FROM_SIGNAL.CREATE_PIPETRANSPORT_CONSUME:
        this.createPipeTransportConsumeHandler({ ws, data, response });
      case EVENT_FROM_SIGNAL.SET_PREFERRED_LAYERS:
        this.setPreferredLayers({ ws, data, response });
        break;
      case EVENT_FROM_SIGNAL.CLOSE_TRANSPORT:
        this.closeTransportHandler({ ws, data, response });
        break;
    }
  }

  private async createRouterHandler({ ws, data, response }: Handler) {
    let ok_router = null;

    try {
      /* 找符合的 router */ /* 目前還沒加 router 限制條件 */
      this._routers.forEach((router) => {
        ok_router = router;
      });
      if (!ok_router) {
        const worker = this._listener._getMediasoupWorkers();
        ok_router = await worker.createRouter({ mediaCodecs: data.mediaCodecs });
        this.log.info('Room [%s] create a router [%s]', this._id, ok_router.id);
      }

      this._routers.set(ok_router.id, ok_router);
      response({
        data: {
          router_id: ok_router.id,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  private getRouterRtpCapabilitiesHandler({ ws, data, response }: Handler) {
    try {
      if (!this._routers.has(data.router_id)) {
        throw new Error('no this router in room');
      }

      response({
        data: {
          mediaCodecs: this._routers.get(data.router_id)?.rtpCapabilities,
        },
      });
    } catch (error) { }
  }

  private async createWebRTCTransportHandler({ ws, data, response }: Handler) {
    const { router_id, producing, consuming } = data;

    try {
      if (!data.router_id) {
      }
    } catch (e) { }
    if (!this._routers.has(router_id)) {
      return;
    }
    const router = this._routers.get(router_id);
    const { maxIncomingBitrate, initialAvailableOutgoingBitrate, minimumAvailableOutgoingBitrate, listenIps } = this._webRTCTransportSettings;
    const transport = await router!.createWebRtcTransport({
      listenIps: listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      enableSctp: true,
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
    transport.on('@close', () => { });
    transport.on('dtlsstatechange', () => { });

    /* Register transport listen event */

    this._transports.set(transport.id, transport);

    response({
      data: {
        transport_id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        transportType: transport.appData.consuming === true ? 'consuming' : 'producing',
      },
    });
  }

  private async connectWebRTCTranportHandler({ ws, data, response }: Handler) {
    try {
      if (!data.transport_id) {
        throw new Error('no input transport_id parameter');
      } else if (!data.dtlsParameters) {
        throw new Error('no input dtlsParameters parameter');
      }
      const transport = this._transports.get(data.transport_id);
      await transport?.connect({
        dtlsParameters: data.dtlsParameters,
      });

      response({
        data: 'Successfully',
      });
    } catch (error: any) {
      console.log(error);
      response({
        data: error.message,
      });
    }
  }

  private async createConsumeHandler({ ws, data, response }: Handler) {
    const { router_id, transport_id, rtpCapabilities, producers } = data;
    const router = this._routers.get(router_id);
    const transport = this._transports.get(transport_id);
    let new_consumerList = [];

    if (producers.length === 0) {
      return;
    }

    for (let producer_id of producers) {
      if (!router!.canConsume({ producerId: producer_id, rtpCapabilities })) {
        this.log.error('[CreateConsumer-Event]：Router [%s] cannot use ProudcerId [%s] to create Consumer', router!.id, producer_id);
        return;
      }
      const consumer = await transport!.consume({
        producerId: producer_id,
        rtpCapabilities: rtpCapabilities,
        paused: false,
      });
      this.log.info('[CreateConsumer-Event]：Create Consumer [%s] use ProducerId [%s] with Router [%s]', consumer.id, producer_id, router_id);

      /* Register Consumer listen event */
      consumer.on('transportclose', () => {
        this.log.info('[CloseConsumer-Event]：Consumer [%s] is closed because transport closed', consumer.id);
        this._consumers.delete(consumer.id);
      });
      consumer.on('producerclose', () => {
        this.log.info('[CloseConsumer-Event]：Consumer [%s] is closed because producer closed', consumer.id);
      });
      consumer.on('layerschange', (layer) => {
        this.log.info('[Consumer-Event]：Consumer [%s] layer change to [%s]', consumer.id, layer);
      });

      /* Register Consumer listen event */

      this._consumers.set(consumer.id, consumer);

      new_consumerList.push({
        id: consumer.id,
        producer_id: producer_id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    }

    response({
      data: {
        new_consumerList: new_consumerList,
      },
    });
  }

  private async createProduceHandler({ ws, data, response }: Handler) {
    const { router_id, transport_id, rtpParameters, rtpCapabilities, kind } = data;
    const transport = this._transports.get(transport_id);

    if (transport === undefined) {
      return;
    }

    const producer = await transport.produce({
      kind: kind,
      rtpParameters: rtpParameters,
    });
    this._producers.set(producer.id, producer);
    /* store redis producers */

    this.log.info('[CreateProducer-Event]：Create Producer [%s] with Router [%s]', producer.id, router_id);
    /*  Register producer listen event */
    producer.on('transportclose', () => {
      this.log.info('[CloseProducer-Event]：Producer [%s] is closed because transport closed', producer.id);
      this._consumers.delete(producer.id);
    });
    /*  Register producer listen event */
    let router: Router | null = null;
    if (this._routers.has(router_id)) {
      router = this._routers.get(router_id)!;
    } else {
      console.log('No routerId [%s]', router_id);
      return;
    }

    /*  連線不同Router  */
    const routerList = this._getOtherRouters({ excludeRouterId: router_id });
    if (routerList.length !== 0) {
      for (let r of routerList) {
        await this._connectToOtherRouter(router!, r, producer.id);
      }
    }

    let consumerMap = {} as any;
    /* 連線到PipeTransportRouter */
    if (this._pipeTransportsRouter !== undefined) {
      await this._connectToOtherRouter(router!, this._pipeTransportsRouter, producer.id);
      for (let [key, value] of this._serverAndPipeTransport) {
        if (consumerMap[key] === undefined) {
          consumerMap[key] = [];
        }
        if (this._pipeTransports.has(value)) {
          const pt = this._pipeTransports.get(value)!;
          const consumer = await this.createPipeTransportConsume(pt, producer.id, rtpCapabilities);
          if (consumer) {
            consumerMap[key].push({
              producer_id: producer.id,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters,
            });
            // await consumer.enableTraceEvent(['rtp']);
            // consumer.on('trace', (trace) => {
            //   console.log(trace);
            // });
          }
        }
      }
    }

    response({
      data: {
        producer_id: producer.id,
        consumerMap: consumerMap,
      },
    });
  }

  private _getOtherRouters({ excludeRouterId = '' }: { excludeRouterId: string }): Array<Router> {
    let routerList: Array<Router> = [];
    this._routers.forEach((router: Router) => {
      if (router.id !== excludeRouterId) {
        routerList.push(router);
      }
    });

    return routerList;
  }

  private async _connectToOtherRouter(router: Router, otherRouter: Router, producerId: string) {
    this.log.info('[PipeToRouter-Event]：Router [%s] pipe to Router [%s]', router.id, otherRouter.id);
    await router.pipeToRouter({
      producerId: producerId,
      router: otherRouter,
      enableRtx: true,
    });
  }

  private async createPipeTransportHandler({ ws, data, response }: Handler) {
    const { server_id, mediaCodecs } = data;

    if (this._pipeTransportsRouter === undefined) {
      const worker = this._listener._getMediasoupWorkers();
      this._pipeTransportsRouter = await worker.createRouter({ mediaCodecs });
      this.log.info('[CreatePipeTransportRouter-Event]：Craete new PipeTransportRouter [%s]', this._pipeTransportsRouter.id);
    } else {
      this.log.warn('[CreatePipeTransportRouter-Event]：PipeTransportRouter is already exist!');
    }

    let pipeTransport: PipeTransport | null = null;
    let state: boolean = false; // control if has already pipetransport connect to remote sfu server
    if (this._serverAndPipeTransport.has(server_id)) {
      const transportId = this._serverAndPipeTransport.get(server_id)!;
      pipeTransport = this._pipeTransports.get(transportId)!;
      state = true;
    } else {
      const { listenIps } = this._pipeTransportSettings;
      pipeTransport = await this._pipeTransportsRouter.createPipeTransport({
        listenIp: listenIps,
        enableRtx: true,
      });
      this._serverAndPipeTransport.set(server_id, pipeTransport.id);
      state = false;
    }

    if (state) {
      this.log.warn('[CreatePipeTransport-Event]：IP [%s] already has pipetransport [%s]', server_id, pipeTransport.id);
    } else {
      this.log.info('[CreatePipeTransport-Event]：Room [%s] Create Pipetransport [%s] to connect ip [%s]', this._id, pipeTransport.id, server_id);
    }

    const {
      id: pipeTransport_id,
      tuple: { localIp, localPort },
    } = pipeTransport;

    this._pipeTransports.set(pipeTransport_id, pipeTransport);

    response({
      data: {
        transport_id: pipeTransport_id,
        ip: localIp,
        port: localPort,
        state: state,
      },
    });
  }

  private async connectPipeTransportHandler({ ws, data, response }: Handler) {
    const pipeTransportId = this._serverAndPipeTransport.get(data.server_id)!;

    if (this._pipeTransports.has(pipeTransportId)) {
      const pipeTransport = this._pipeTransports.get(pipeTransportId)!;

      let msg: string = '';
      try {
        await pipeTransport.connect({
          ip: data.ip,
          port: data.port,
        });
        msg = 'Successfully';
      } catch (error) {
        msg = 'Failed';
      }

      response({
        data: {
          msg,
        },
      });
    } else {
      response({
        data: {},
      });
    }
  }

  private async createPipeTransportProduceHandler({ ws, data, response }: Handler) {
    const { server_id, consumerMap } = data;

    /**
     *  consumerMap = [
     *      {
     *        producer_id,
     *        kind,
     *        rtpParameters
     *      }
     *    ]
     */

    const pipeTransportId = this._serverAndPipeTransport.get(server_id)!;
    let producer = null;
    if (this._pipeTransports.has(pipeTransportId)) {
      const pt = this._pipeTransports.get(pipeTransportId)!;
      for (let { producer_id, kind, rtpParameters } of consumerMap) {
        producer = await pt.produce({
          id: producer_id,
          kind: kind,
          rtpParameters: rtpParameters,
        });
        this._producers.set(producer.id, producer);
        // TEST TO DEBUG
        // await producer.enableTraceEvent(['rtp']);

        // producer.on('trace', (trace) => {
        //   console.log(trace);
        // });
        console.log('[CreateProducer-PipeTransport-Event]：PipeTransport [%s] create Producer [%s]', pt.id, producer.id);
        for (let [key, router] of this._routers) {
          await this._connectToOtherRouter(this._pipeTransportsRouter!, router, producer!.id);
        }
        console.log('testoutestinerter');
      }
    }
    console.log('testouter');
    response({
      data: {},
    });
  }

  private async createPipeTransportConsumeHandler({ ws, data, response }: Handler) {
    const { server_id, producerMap } = data;
    /**
     *  producerMap = {
     *    routerId: [
     *      {
     *        producerId,
     *        rtpCapabilities
     *      }
     *    ]
     *  }
     */

    let pipeTransport = null;
    const pipeTransportId = this._serverAndPipeTransport.get(server_id)!;
    let consumerMap = {} as any;
    if (this._pipeTransports.has(pipeTransportId)) {
      pipeTransport = this._pipeTransports.get(pipeTransportId)!;
      if (consumerMap[server_id] === undefined) {
        consumerMap[server_id] = [];
      }
      for (let [routerId, producerInfoArray] of Object.entries(producerMap)) {
        const router = this._routers.get(routerId)!;
        for (let { producerId, rtpCapabilities } of producerInfoArray as Array<any>) {
          if (this._pipeTransportsRouter !== undefined) {
            if (this._alreadyPipeToRouterProudcer.has(producerId)) {
              continue;
            } else {
              this._alreadyPipeToRouterProudcer.set(producerId, producerId);
              await this._connectToOtherRouter(router, this._pipeTransportsRouter, producerId);
              const consumer = await this.createPipeTransportConsume(pipeTransport, producerId, rtpCapabilities);

              if (consumer) {
                consumerMap[server_id].push({
                  producer_id: producerId,
                  remotePipeTransport_id: pipeTransportId,
                  kind: consumer.kind,
                  rtpParameters: consumer.rtpParameters,
                });
              }
            }
          }
        }
      }
    }
    response({
      data: {
        consumerMap: consumerMap,
      },
    });
  }

  private async createPipeTransportConsume(pt: PipeTransport, producerId: string, rtpCapabilities: any) {
    if (!this._pipeTransportsRouter?.canConsume({ producerId, rtpCapabilities })) {
      console.error('can not consume');
      return false;
    }

    const consumer = await pt.consume({
      producerId: producerId,
    });
    console.log(
      '[CreateConsumer-PipeTransport-Event]：Create Consumer [%s] use ProducerId [%s] with PipeTransport [%s]',
      consumer.id,
      producerId,
      pt.id
    );
    return consumer;
  }

  private async setPreferredLayers({ ws, data, response }: Handler) {
    const { consumer_id, spatialLayer } = data;
    const consumer = this._consumers.get(consumer_id);
    if (consumer) {
      await consumer.setPreferredLayers(
        { spatialLayer: spatialLayer })
    }
  }
  private async closeTransportHandler({ ws, data, response }: Handler) {
    const { sendTransport_id, recvTransport_id } = data;
    this.closeTransport(sendTransport_id);
    this.closeTransport(recvTransport_id);
    response({ data: {} });
  }

  private closeTransport(id: string) {
    if (this._transports.has(id)) {
      const transport = this._transports.get(id);
      console.log('[WebRTCTransport-CloseTransport-Event]：Close transport [%s]', transport?.id);
      transport?.close();
      this._transports.delete(id);
    }
  }

  errorHandler(text: string) { }
}

import { Router, Transport, Consumer, Producer, PipeTransport, Worker } from 'mediasoup/node/lib/types';
import { ServerEngine } from './engine';
import { WebSocket } from 'ws';
import { WSTransport } from './websocket/wstransport';

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
  CLOSE_TRANSPORT: 'closeTransport',
};
const EVENT_FOR_SIGNAL_REQUEST = {
  CONNECT_PIPETRANSPORT: 'connectPipetransport',
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

export class Room {
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

  private _serverAndPipeTransport: Map<string, Record<string, any>>;

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
      case EVENT_FROM_SIGNAL.CLOSE_TRANSPORT:
        this.closeTransport({ ws, data, response });
        break;
    }
  }

  private async createRouterHandler({ ws, data, response }: Handler) {
    const { mediaCodecs } = data;

    let ok_router = null;
    /* 找符合的 router */ /* 目前還沒加 router 限制條件 */
    this._routers.forEach((router) => {
      ok_router = router;
    });
    if (!ok_router) {
      const worker = this._listener._getMediasoupWorkers();
      ok_router = await worker.createRouter({ mediaCodecs });
    }

    this._routers.set(ok_router.id, ok_router);

    response({
      data: {
        router_id: ok_router.id,
      },
    });
  }

  private getRouterRtpCapabilitiesHandler({ ws, data, response }: Handler) {
    const { router_id } = data;
    if (!this._routers.has(router_id)) {
      return;
    }

    response({
      data: {
        mediaCodecs: this._routers.get(router_id)?.rtpCapabilities,
      },
    });
  }

  private async createWebRTCTransportHandler({ ws, data, response }: Handler) {
    const { router_id, producing, consuming } = data;

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
    transport.on('@close', () => {});
    transport.on('dtlsstatechange', () => {});

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
    const { router_id, transport_id, dtlsParameters } = data;
    const transport = this._transports.get(transport_id);
    await transport?.connect({
      dtlsParameters: dtlsParameters,
    });

    response({
      data: 'Successfully',
    });
  }

  private async createConsumeHandler({ ws, data, response }: Handler) {
    const { router_id, transport_id, rtpCapabilities, producers } = data;
    const router = this._routers.get(router_id);
    const transport = this._transports.get(transport_id);

    let new_consumerList = [];
    for (let { producer_id } of producers) {
      if (!router!.canConsume({ producerId: producer_id, rtpCapabilities })) {
        console.error('can not consume');
        return;
      }
      const consumer = await transport!.consume({
        producerId: producer_id,
        rtpCapabilities: rtpCapabilities,
        paused: false,
      });
      console.log('[CreateConsumer-Event]：Create Consumer [%s] use ProducerId [%s] with Router [%s]', consumer.id, producer_id, router_id);
      /* Register Consumer listen event */
      consumer.on('transportclose', () => {
        console.log('Consumer transport close', { consumer_id: `${consumer.id}` });
        this._consumers.delete(consumer.id);
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

    console.log('[CreateProducer-Event]：Create Producer [%s] with Router [%s]', producer.id, router_id);
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
        if (this._pipeTransports.has(value.localTransport_id)) {
          const consumer = await this.createPipeTransportConsume(value.localTransport_id, producer.id, rtpCapabilities);
          consumerMap[key] = {
            producer_id: producer.id,
            remotePipeTransport_id: value.remoteTransport_id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          };
          // await consumer.enableTraceEvent(['rtp']);
          // consumer.on('trace', (trace) => {
          //   console.log(trace);
          // });
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
    console.log('[PipeToRouter-Event]：Router [%s] pipe to Router [%s]', router.id, otherRouter.id);
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
      console.log('Craete new PipeTransportRouter [%s]', this._pipeTransportsRouter.id);
    } else {
      console.log('PipeTransportRouter is already exist!');
    }

    let pipeTransport: PipeTransport | null = null;
    let state: boolean = false; // control if has already pipetransport connect to remote sfu server
    if (this._serverAndPipeTransport.has(server_id)) {
      const transportInfo = this._serverAndPipeTransport.get(server_id)!;
      pipeTransport = this._pipeTransports.get(transportInfo.localTransport_id)!;
      state = true;
    } else {
      const { listenIps } = this._pipeTransportSettings;
      pipeTransport = await this._pipeTransportsRouter.createPipeTransport({
        listenIp: listenIps,
        enableRtx: true,
      });
      this._serverAndPipeTransport.set(server_id, {
        localTransport_id: pipeTransport.id,
      });
      state = false;
    }

    if (state) {
      console.log('IP [%s] already has pipetransport [%s]', server_id, pipeTransport.id);
    } else {
      console.log('Room [%s] Create Pipetransport [%s] to connect ip [%s]', this._id, pipeTransport.id, server_id);
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
    if (this._pipeTransports.has(data.localTransport_id)) {
      const pipeTransport = this._pipeTransports.get(data.localTransport_id)!;

      let msg: string = '';
      try {
        await pipeTransport.connect({
          ip: data.ip,
          port: data.port,
        });
        console.log(await pipeTransport.dump());
        const serverAndPT = {
          remoteTransport_id: data.remoteTransport_id,
          ...this._serverAndPipeTransport.get(data.server_id)!,
        };
        this._serverAndPipeTransport.set(data.server_id, serverAndPT);
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
      response({});
    }
  }

  private async createPipeTransportProduceHandler({ ws, data, response }: Handler) {
    const { producer_id, remotePipeTransport_id: pipeTransport_id, kind, rtpParameters } = data;

    let producer = null;
    if (this._pipeTransports.has(pipeTransport_id)) {
      const pt = this._pipeTransports.get(pipeTransport_id)!;
      producer = await pt.produce({
        id: producer_id,
        kind: kind,
        rtpParameters: rtpParameters,
      });
      console.log('[CreateProducer-PipeTransport-Event]：PipeTransport [%s] create Producer [%s]', pt.id, producer.id);

      // TEST TO DEBUG
      // await producer.enableTraceEvent(['rtp']);

      // producer.on('trace', (trace) => {
      //   console.log(trace);
      // });
    }

    for (let [key, router] of this._routers) {
      await this._connectToOtherRouter(this._pipeTransportsRouter!, router, producer!.id);
    }

    response({
      data: {
        producer_id,
      },
    });
  }

  private async createPipeTransportConsumeHandler({ ws, data, response }: Handler) {
    const { producerId, remotePipeTransport_id: pipeTransport_id, rtpCapabilities } = data;

    let consumer = null;
    if (this._pipeTransports.has(pipeTransport_id)) {
      const consumer = await this.createPipeTransportConsume(pipeTransport_id, producerId, rtpCapabilities);
    }
  }

  private async createPipeTransportConsume(pipeTransportId: string, producerId: string, rtpCapabilities: any) {
    const pt = this._pipeTransports.get(pipeTransportId)!;

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

  private async closeTransport({ ws, data, response }: Handler) {
    response({});
  }
}

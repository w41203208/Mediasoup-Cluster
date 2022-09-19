import { Router, Transport, Consumer, Producer } from 'mediasoup/node/lib/types';
import { ServerEngine } from './engine';
import { WebSocket } from 'ws';

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

export class Room {
  private _id: string;
  private _listener: ServerEngine;
  private _routers: Map<string, Router>;
  private _transports: Map<string, Transport>;
  private _consumers: Map<string, Consumer>;
  private _producers: Map<string, Producer>;

  private _webRTCTransportSettings: Record<string, any>;

  constructor(id: string, listener: ServerEngine, webRTCTransportSettings: Record<string, any>) {
    this._id = id;
    this._listener = listener;
    this._routers = new Map();
    this._transports = new Map();
    this._consumers = new Map();
    this._producers = new Map();

    this._webRTCTransportSettings = webRTCTransportSettings;
  }

  get id() {
    return this._id;
  }

  handleConnection(ws: WebSocket) {
    ws.on('message', (message: any) => {
      const { id, data, type } = JSON.parse(message);
      this._websocketHandler({ id, type, data, ws });
    });
  }
  private _websocketHandler({ id, type, data, ws }: WebSocketHandler) {
    switch (type) {
      case EVENT_FOR_SFU.CREATE_ROUTER:
        this.createRouter({ id, data, ws });
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
      case EVENT_FOR_SFU.CREATE_PRODUCE:
        this.createProduce({ id, data, ws });
        break;
    }
  }

  private async createRouter({ id, data, ws }: Handler) {
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

    ws.send(
      JSON.stringify({
        id: id,
        data: {
          router_id: ok_router.id,
        },
      })
    );
  }

  private getRouterRtpCapabilities({ id, data, ws }: Handler) {
    const { router_id } = data;
    if (!this._routers.has(router_id)) {
      return;
    }
    ws.send(
      JSON.stringify({
        id: id,
        data: {
          mediaCodecs: this._routers.get(router_id)?.rtpCapabilities,
        },
      })
    );
  }

  private async createWebRTCTransport({ id, data, ws }: Handler) {
    const { router_id, producing, consuming } = data;

    if (!this._routers.has(router_id)) {
      return;
    }
    const router = this._routers.get(router_id);
    const { maxIncomingBitrate, initialAvailableOutgoingBitrate, minimumAvailableOutgoingBitrate, listenIps } = this._webRTCTransportSettings;
    console.log(listenIps);
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
    const transport = this._transports.get(transport_id);
    await transport?.connect({
      dtlsParameters: dtlsParameters,
    });
    ws.send(
      JSON.stringify({
        id: id,
        data: 'Successfully',
      })
    );
  }

  private async createConsume({ id, data, ws }: Handler) {
    const { router_id, transport_id, rtpCapabilities, producers } = data;
    const router = this._routers.get(router_id);
    const transport = this._transports.get(transport_id);

    if (router === undefined || transport === undefined) {
      return;
    }
    let new_consumerList = [];
    for (let { producer_id } of producers) {
      if (!router.canConsume({ producerId: producer_id, rtpCapabilities })) {
        console.error('can not consume');
        return;
      }
      const consumer = await transport.consume({
        producerId: producer_id,
        rtpCapabilities: rtpCapabilities,
      });
      console.log('Create Consumer: [%s]', consumer.id);
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

    ws.send(
      JSON.stringify({
        id: id,
        data: {
          new_consumerList: new_consumerList,
        },
      })
    );
  }

  private async createProduce({ id, data, ws }: Handler) {
    const { router_id, transport_id, rtpParameters, kind } = data;
    const transport = this._transports.get(transport_id);

    if (transport === undefined) {
      return;
    }

    const producer = await transport.produce({
      kind: kind,
      rtpParameters: rtpParameters,
    });
    this._producers.set(producer.id, producer);
    console.log('Create Producer: [%s]', producer.id);
    /*  Register producer listen event */
    ws.send(
      JSON.stringify({
        id: id,
        data: {
          producer_id: producer.id,
        },
      })
    );
  }
}

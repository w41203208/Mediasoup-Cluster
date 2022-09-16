const { EventEmitter } = require('../util/emitter');
import { ServerEngine } from '../engine';
import { WebSocket } from 'ws';

const EVENT_FROM_CLIENT_REQUEST = {
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  GET_PRODUCERS: 'getProducers',
  GET_ROUTER_RTPCAPABILITIES: 'getRouterRtpCapabilities',
  CREATE_WEBRTCTRANSPORT: 'createWebRTCTransport',
  CONNECT_WEBRTCTRANPORT: 'connectWebRTCTransport',
  PRODUCE: 'produce',
  CONSUME: 'consume',
  GET_ROOM_INFO: 'getRoomInfo',
  LEAVE_ROOM: 'leaveRoom',
  CLOSE_ROOM: 'closeRoom',
};

export class Peer extends EventEmitter {
  private _id: string;
  private _name: string;
  private _serverId?: string;
  private _routerId?: string;

  private _sendTransport?: any;
  private _recvTransport?: any;
  private _producers: Map<string, Record<string, any>>;
  private _consumers: Map<string, Record<string, any>>;
  private _rtpCapabilities?: any;

  private _ws: WebSocket;

  private _listener: ServerEngine;
  constructor(peer_id: string, peer_name: string = '', websocket: WebSocket, listener: ServerEngine) {
    super();
    /* base info */
    this._id = peer_id;
    this._name = peer_name;
    this._serverId;
    this._routerId;

    /* mediasoup info */
    this._sendTransport = null;
    this._recvTransport = null;
    this._producers = new Map();
    this._consumers = new Map();
    this._rtpCapabilities = null;

    /* websocket */
    this._ws = websocket;

    /* advanced */
    this._listener = listener;

    this._handleTransportMessgae();
  }

  _handleTransportMessgae() {
    this._ws.on('request', (message: { id: string; type: string; data: any }, response: Function) => {
      const { id, type, data } = message;
      switch (type) {
        case EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM:
          const { room_id } = data;
          console.log('User [%s] create room [%s].', this._id, room_id);
          this._listener.handleRequest(id, type, data, response);
          break;
      }
    });
  }

  set serverId(id) {
    this._serverId = id;
  }

  set routerId(id) {
    this._routerId = id;
  }

  set rtpCapabilities(cp) {
    this._rtpCapabilities = cp;
  }

  get serverId() {
    return this._serverId;
  }
  get routerId() {
    return this._routerId;
  }

  get sendTransport() {
    return this._sendTransport;
  }

  get recvTransport() {
    return this._recvTransport;
  }

  get producers() {
    return this._producers;
  }

  get consumers() {
    return this._consumers;
  }

  get rtpCapabilities() {
    return this._rtpCapabilities;
  }

  addTransport(id: string, transportType: string) {
    if (transportType === 'consuming') {
      this._recvTransport = {
        id: id,
      };
    } else {
      this._sendTransport = {
        id: id,
      };
    }
  }

  addProducer(id: string) {
    this._producers.set(id, {
      id: id,
    });
  }
  addConsumer(id: string) {
    this._consumers.set(id, {
      id: id,
    });
  }
}

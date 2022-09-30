const { EventEmitter } = require('../util/emitter');
import { ServerEngine } from '../engine';
import { WSTransport } from 'src/connect/WSTransport';

import { Timer } from '../util/Timer';
import { EVENT_FROM_CLIENT_REQUEST } from '../EVENT';

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

  private _ws: WSTransport;
  public _heartCheck: Timer;

  private _listener: ServerEngine;

  constructor(peer_id: string, peer_name: string = '', websocket: WSTransport, listener: ServerEngine) {
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
    this._heartCheck = new Timer(10 * 1000);

    /* advanced */
    this._listener = listener;
    this._inRoom = false;

    this._handleTransportMessgae();
  }

  _handleTransportMessgae() {
    this._ws.on('request', (message: { type: string; data: any }, response: Function) => {
      const { type, data } = message;
      switch (type) {
        case EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM:
          data.peer_id = this.id;
          this._listener.handlePeerRequest(type, data, response);
          break;
        case EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM:
          data.peer = this;
          this._listener.handlePeerRequest(type, data, response);
          break;
        default:
          this.emit('handleOnRoomRequest', this, type, data, response);
          break;
      }
    });

    this._ws.on('notification', (message: { type: string; data: any }, notify: Function) => {
      const { type, data } = message;
      switch (type) {
        default:
          this.emit('handleOnRoomNotification', this, type, data, notify);
          break;
      }
    });
  }

  get socket() {
    return this._ws;
  }

  get id() {
    return this._id;
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

  set inRoom(stats: boolean) {
    this._inRoom = stats;
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

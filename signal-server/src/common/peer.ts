const { EventEmitter } = require('../util/emitter');
import { ServerEngine } from '../engine';
import { WSTransport } from 'src/run/WSTransport';

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

const EVENT_FOR_TEST = {
  TEST1: 'test1',
  TEST2: 'test2',
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

  private _ws: WSTransport;
  public _heartCheck: HeartCheck;

  private _listener: ServerEngine;
  private _inRoom: boolean;

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
    this._heartCheck = new HeartCheck(this._ws)


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
          this._listener.handleRequest(type, data, response);
          break;
        case EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM:
          data.peer = this;
          this._listener.handleRequest(type, data, response);
          break;
        // test
        case EVENT_FOR_TEST.TEST1:
          console.log('test1');
          let sum = 0;
          for (let i = 0; i < 2000000000; i++) {
            sum += i;
          }
          response({
            type: 'test1',
            data: sum,
          });
          break;
        // test
        // test
        case EVENT_FOR_TEST.TEST2:
          console.log('test2');
          let sum1 = 0;
          for (let i = 0; i < 2000000000; i++) {
            sum1 += i;
          }
          response({
            type: 'test2',
            data: sum1,
          });
          break;
        // test
        default:
          this.emit('handleOnRoomRequest', this, type, data, response);
          break;
      }
    });

    this._ws.on('notification', ((message: { type: string; data: any }) => {
      const { type, data } = message;
      switch (type) {
        case 'heartBeatCheck':
          if (data === 'pong') this._heartCheck.reset().start();
          break;
      }
    }));
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

class HeartCheck {
  private timeout: number;
  private timeoutObj: any;
  private serverTimeoutObj: any;
  public reset: Function;
  public start: Function;
  public callback: Function;

  constructor(wsTransport: WSTransport) {
    this.timeout = 10 * 1000;
    this.timeoutObj = 123;
    this.callback = Function
    this.reset = () => {
      if (this.timeoutObj) clearTimeout(this.timeoutObj);
      if (this.serverTimeoutObj) clearTimeout(this.serverTimeoutObj);
      return this;
    }
    this.start = (callback: Function) => {
      this.callback = callback;
      this.timeoutObj = setTimeout(() => {
        wsTransport.notify({
          type: 'heartBeatCheck',
          data: 'ping',
        });
        this.serverTimeoutObj = setTimeout(() => {
          wsTransport.close();
          console.log("websocketClose");
          this.callback();
        }, this.timeout);
      }, this.timeout);
    }
  }
}
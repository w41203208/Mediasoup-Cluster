import { HttpsServer } from './run/HttpsServer';
import { WSServer } from './run/WSServer';
import { Peer } from './common/peer';
import { createRedisController, ControllerLoader } from './redis/index';
import { EngineOptions, HttpsServerOptions } from './type';

import { v4 } from 'uuid';

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

export class ServerEngine {
  private _httpsServerOption: HttpsServerOptions;
  constructor({ httpsServerOption }: EngineOptions) {
    this._httpsServerOption = httpsServerOption;
  }

  async run() {
    const { RoomController, SFUServerController, PlayerController } = await createRedisController(ControllerLoader.bootstrap());
    const httpsServer = new HttpsServer(this._httpsServerOption, this);

    const websocketServer = new WSServer(httpsServer.run().runToHttps());

    websocketServer.on('connection', (getTransport: Function) => {
      const peerTransport = getTransport();

      const peer = new Peer(v4(), '', peerTransport, this);
    });
  }

  handleRequest(id: string, type: string, data: any, response: Function) {
    switch (type) {
      case EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM:
        this.createRoom(id, data, response);
        break;
    }
  }

  createRoom(id: string, data: any, response: Function) {}
}

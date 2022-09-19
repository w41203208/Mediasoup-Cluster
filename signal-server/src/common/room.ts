import { SFUServer } from './SFUServer';
import { Peer } from './peer';
import { SFUConnectionManager } from 'src/run/SFUConnectionManager';

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

const EVENT_FOR_CLIENT_NOTIFICATION = {
  NEW_CONSUMER: 'newConsumer',
};

const EVENT_FOR_SFU = {
  CREATE_ROUTER: 'createRouter',
  GET_ROUTER_RTPCAPABILITIES: 'getRouterRtpCapabilities',
  CREATE_WEBRTCTRANSPORT: 'createWebRTCTransport',
  CONNECT_WEBRTCTRANPORT: 'connectWebRTCTransport',
  CREATE_PRODUCE: 'createProduce',
  CREATE_CONSUME: 'createConsume',
};

export class Room {
  private _mediaCodecs: Record<string, any>;
  private _id: string;
  private _sfuServers: Map<string, SFUServer>;
  private _routers: Map<string, any>;
  private _peers: Map<string, Peer>;
  private _sfuConnectionManager: SFUConnectionManager;

  constructor(
    room_id: string,
    mediaCodecs: Record<string, any>,
    sfuConnectionManager: SFUConnectionManager
  ) {
    this._mediaCodecs = mediaCodecs;
    this._id = room_id;
    this._sfuServers = new Map();
    this._routers = new Map();
    this._peers = new Map();

    this._sfuConnectionManager = sfuConnectionManager;
  }

  getOtherPeerProducers(id: string) {
    let producerList: Array<Record<string, string>> = [];
    this._peers.forEach((peer: Peer) => {
      if (peer.id !== id) {
        peer.producers.forEach((producer: any) => {
          producerList.push({
            producer_id: producer.id,
          });
        });
      }
    });
    return producerList;
  }

  get id() {
    return this._id;
  }

  /************* Peer *************/
  getPeer(id: string) {
    return this._peers.get(id);
  }

  getJoinedPeers({ excludePeer = {} as Peer }): Array<string> {
    let producerList: Array<string> = [];
    this._peers.forEach((peer: any) => {
      if (peer.id !== excludePeer.id) {
        producerList.push(peer);
      }
    });
    return producerList;
  }

  addPeer(peer: Peer) {
    this._peers.set(peer.id, peer);
    peer.on(
      'handleOnRoomRequest',
      (peer: Peer, type: string, data: any, response: Function) => {
        this._handlePeerRequest(peer, type, data, response);
      }
    );
  }

  removePeer(id: string) {
    return this._peers.delete(id);
  }

  addRouter(id: string) {
    this._routers.set(id, {
      id: id,
    });
  }

  /************* Router *************/
  getRouters(): Array<string> {
    let routerList: Array<string> = [];
    this._routers.forEach((router: any) => {
      routerList.push(router.id);
    });
    return routerList;
  }

  /************* SFUServer *************/
  getSFUServer(id: string) {
    return this._sfuServers.get(id);
  }

  addSFUServer(sfuServer: SFUServer) {
    this._sfuServers.set(sfuServer.id, sfuServer);
  }

  async _handlePeerRequest(
    peer: Peer,
    type: string,
    data: any,
    response: Function
  ) {
    switch (type) {
      case EVENT_FROM_CLIENT_REQUEST.CLOSE_ROOM:
        break;
      case EVENT_FROM_CLIENT_REQUEST.LEAVE_ROOM:
        break;
      case EVENT_FROM_CLIENT_REQUEST.GET_ROUTER_RTPCAPABILITIES:
        const serverSocket = this._sfuConnectionManager.getServerSocket(
          peer.serverId!
        );

        if (!serverSocket) return;
        // const recordServer = room.getRecordServer(peer.serverId);

        serverSocket
          .sendData({
            data: {
              router_id: peer.routerId,
            },
            type: EVENT_FOR_SFU.GET_ROUTER_RTPCAPABILITIES,
          })
          .then((data) => {
            const { mediaCodecs } = data;
            response({
              type: EVENT_FROM_CLIENT_REQUEST.GET_ROUTER_RTPCAPABILITIES,
              data: { codecs: mediaCodecs },
            });
          });
        break;
      case EVENT_FROM_CLIENT_REQUEST.CREATE_WEBRTCTRANSPORT:
        break;
      case EVENT_FROM_CLIENT_REQUEST.CONNECT_WEBRTCTRANPORT:
        break;
      case EVENT_FROM_CLIENT_REQUEST.PRODUCE:
        break;
      case EVENT_FROM_CLIENT_REQUEST.GET_PRODUCERS:
        break;
    }
  }

  // broadcast(peers, data) {
  //   peers.forEach((peer) => {
  //     peer.notify(data);
  //   });
  // }

  // consume({ consumerPeer, producer }) {
  //   consumerPeer.createConsumer(producer);
  // }
}

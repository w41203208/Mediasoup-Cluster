import { SFUServer } from './SFUServer';
import { Peer } from './peer';

export class Room {
  private _mediaCodecs: Record<string, any>;
  private _id: string;
  private _sfuServers: Map<string, SFUServer>;
  private _routers: Map<string, any>;
  private _peers: Map<string, Peer>;

  constructor(room_id: string, mediaCodecs: Record<string, any>) {
    this._mediaCodecs = mediaCodecs;
    this._id = room_id;
    this._sfuServers = new Map();
    this._routers = new Map();
    this._peers = new Map();
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

  addPeer(peer: Peer) {
    this._peers.set(peer.id, peer);
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

  getJoinedPeers({ excludePeer = {} as Peer }): Array<string> {
    let producerList: Array<string> = [];
    this._peers.forEach((peer: any) => {
      if (peer.id !== excludePeer.id) {
        producerList.push(peer);
      }
    });
    return producerList;
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

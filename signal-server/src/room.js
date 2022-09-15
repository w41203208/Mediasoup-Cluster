module.exports = class Room {
  constructor(room_id, mediaCodecs) {
    this._mediaCodecs = mediaCodecs;
    this.id = room_id;
    this.recordServers = new Map();
    this.routers = new Map();
    this.peers = new Map();
  }

  getOtherPeerProducers(id) {
    let producerList = [];
    this.peers.forEach((peer) => {
      if (peer.id !== id) {
        peer.producers.forEach((producer) => {
          producerList.push({
            producer_id: producer.id,
          });
        });
      }
    });
    return producerList;
  }

  addPeer(peer) {
    this.peers.set(peer.id, peer);
  }

  addRouter(id) {
    this.routers.set(id, {
      id: id,
    });
  }

  addRecordServer(recordServer) {
    this.recordServers.set(recordServer.id, recordServer);
  }

  getPeer(id) {
    return this.peers.get(id);
  }

  removePeer(id) {
    return this.peers.delete(id);
  }

  getRouters() {
    let routerList = [];
    this.routers.forEach((router) => {
      routerList.push(router.id);
    });
    return routerList;
  }

  getRecordServer(id) {
    return this.recordServers.get(id);
  }

  getJoinedPeers({ excludePeer = {} }) {
    let producerList = [];
    this.peers.forEach((peer) => {
      if (peer.id !== excludePeer.id) {
        producerList.push(peer);
      }
    });
    return producerList;
  }

  broadcast(peers, data) {
    peers.forEach((peer) => {
      peer.notify(data);
    });
  }

  // consume({ consumerPeer, producer }) {
  //   consumerPeer.createConsumer(producer);
  // }
};

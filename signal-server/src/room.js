module.exports = class Room {
  constructor(room_id, ws, mediaCodecs) {
    this._mediaCodecs = mediaCodecs;
    this.id = room_id;
    this.wsServer = ws;
    this.recordServers = new Map();
    this.peers = new Map();
  }
  getPeer(id) {
    return this.peers.get(id);
  }

  addPeer(peer) {
    this.peers.set(peer.id, peer);
  }

  getOtherPeerProducers(id) {
    let producerList = [];
    this.peers.forEach((peer) => {
      if (peer.id !== id) {
        peer.producers.forEach((producer) => {
          producerList.push({
            id: producer.id,
          });
        });
      }
    });
    return producerList;
  }

  getRecordServer(id) {
    return this.recordServers.get(id);
  }
  addRecordServer(recordServer) {
    this.recordServers.set(recordServer.id, recordServer);
  }

  // consume({ consumerPeer, producer }) {
  //   consumerPeer.createConsumer(producer);
  // }
};

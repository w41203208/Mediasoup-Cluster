module.exports = class Room {
  constructor(room_id, ws, mediaCodecs) {
    this._mediaCodecs = mediaCodecs;
    this.id = room_id;
    this.wsServer = ws;
    // this.recordServers = new Map();
    this.peers = new Map();
  }
  getPeer(id) {
    return this.peers.get(id);
  }

  addPeer(peer) {
    this.peers.set(peer.id, peer);
  }

  // addRecordServer(recordServer) {
  //   this.recordServers.set(recordServer.id, recordServer);
  // }
};

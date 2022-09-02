const config = require('../config');
module.exports = class Room {
  constructor(room_id, ws) {
    this.mediaCodecs = config.MediasoupSetting.router.mediaCodecs;
    this.id = room_id;
    this.wsServer = ws;
    this.recordServers = new Map();
    this.peers = new Map();
  }
  addPeer(peer) {
    this.peers.set(peer.id, peer);
  }
  addRecordServer(recordServer) {
    this.recordServers.set(recordServer.id, recordServer);
  }
};

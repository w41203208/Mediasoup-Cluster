const { EventEmitter } = require('./emitter');

module.exports = class Peer extends EventEmitter {
  constructor(peer_id, peer_name = '', websocket) {
    super();
    this.id = peer_id;
    this.name = peer_name;
    this.ws = websocket;

    this.peerHandleWSMessage();
  }

  peerHandleWSMessage() {
    this.ws.on('message', (message) => {
      const jsonMessage = JSON.parse(message);
      this.emit('handle', jsonMessage);
    });
  }
};

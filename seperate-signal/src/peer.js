const { EventEmitter } = require('./emitter');

module.exports = class Peer extends EventEmitter {
  constructor(peer_id, peer_name = '', websocket) {
    super();
    /* base info */
    this.id = peer_id;
    this.name = peer_name;
    this._serverId;
    this._routerId;

    /* signal server info */
    this.ws = websocket;

    /* mediasoup info */
    this._transport = new Map();
    this._producer = new Map();
    this._consumer = new Map();
    this.peerHandleWSMessage();
  }

  set serverId(id) {
    this._serverId = id;
  }
  set routerId(id) {
    this._routerId = id;
  }

  get serverId() {
    return this._serverId;
  }
  get routerId() {
    return this._routerId;
  }

  peerHandleWSMessage() {
    this.ws.on('message', (message) => {
      const jsonMessage = JSON.parse(message);
      this.emit('handle', jsonMessage);
    });
    this.ws.sendData = (data) => {
      this.ws.send(JSON.stringify({ ...data }));
    };
  }

  addTransport(id) {
    this._transport.set(id, id);
  }

  addProducer(id) {
    this._producer.set(id, id);
  }

  createConsumer() {}
};

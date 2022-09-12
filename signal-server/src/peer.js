const { EventEmitter } = require('./emitter');

module.exports = class Peer extends EventEmitter {
  constructor(peer_id, peer_name = '', websocket) {
    super();
    /* base info */
    this.id = peer_id;
    this.name = peer_name;
    this._serverId;
    this._routerId;

    /* mediasoup info */
    this._sendTransport = null;
    this._recvTransport = null;
    this._producers = new Map();
    this._consumers = new Map();
    this._rtpCapabilities = null;

    /* websocket */
    this.ws = websocket;
    this.peerHandleWSMessage();
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

  peerHandleWSMessage() {
    this.ws.on('message', (message) => {
      const jsonMessage = JSON.parse(message);
      const { messageType, ...rest } = jsonMessage;
      switch (messageType) {
        case 'request':
          this._handlerRequest(rest);
          break;
        case 'response':
          this._handlerResponse(rest);
          break;
        case 'notification':
          this._handlerNotification(rest);
          break;
      }
    });
    this.ws.sendData = (data) => {
      this.ws.send(JSON.stringify({ ...data }));
    };
  }
  _handlerRequest(request) {
    this.emit('request', request, (sendData) => {
      sendData.messageType = 'response';
      this.ws.sendData(sendData);
    });
  }
  _handlerResponse() {}
  _handlerNotification(notification) {
    this.emit('notification', notification, (sendData) => {
      sendData.messageType = 'notification';
      this.ws.sendData(sendData);
    });
  }

  notify(sendData) {
    sendData.messageType = 'notification';
    this.ws.sendData(sendData);
  }

  addTransport(id, transportType) {
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

  addProducer(id) {
    this._producers.set(id, {
      id: id,
    });
  }
  addConsumer(id) {
    this._consumers.set(id, {
      id: id,
    });
  }
};

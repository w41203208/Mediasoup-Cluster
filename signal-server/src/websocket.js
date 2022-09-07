const { EventEmitter } = require('./emitter');
const { Server } = require('ws');

class WSServer extends EventEmitter {
  constructor(server) {
    super();
    this._socket = new Server({ server });
    this._socket.on('open', () => {
      console.log('Websocket is connected');
    });
    this._socket.on('connection', (ws) => {
      this.emit('connection', ws);
    });
  }

  get socket() {
    return this._socket;
  }
}

module.exports = {
  WSServer: WSServer,
};

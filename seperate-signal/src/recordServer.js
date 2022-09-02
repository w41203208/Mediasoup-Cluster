module.exports = class RecordServer {
  constructor(server_id, server_ip, server_port, socket) {
    this.id = server_id;
    this.ip = server_ip;
    this.port = server_port;
    this.serverSocket = socket;
    this.recordRouter = new Map();
  }
};

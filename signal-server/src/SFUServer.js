module.exports = class SFUServer {
  constructor(server_id, socket) {
    this.id = server_id;
    this.serverSocket = socket;
    this.recordRouters = new Map();
  }

  addReocrdRouter(recordRouter) {
    this.recordRouters.set(recordRouter.id, recordRouter);
  }
};

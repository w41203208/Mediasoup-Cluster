import { SFUServerSocket } from './SFUServerSocket';

export class SFUServer {
  private _id: string;
  private _serverSocket: SFUServerSocket;
  constructor(server_id: string, socket: SFUServerSocket) {
    this._id = server_id;
    this._serverSocket = socket;
  }

  get id() {
    return this._id;
  }

  get serverSocket() {
    return this._serverSocket;
  }

  // addReocrdRouter(recordRouter) {
  //   this.recordRouters.set(recordRouter.id, recordRouter);
  // }
}

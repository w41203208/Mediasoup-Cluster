export class SFUServer {
  private _id: string;
  constructor(server_id: string) {
    this._id = server_id;
  }

  get id() {
    return this._id;
  }

  // addReocrdRouter(recordRouter) {
  //   this.recordRouters.set(recordRouter.id, recordRouter);
  // }
}

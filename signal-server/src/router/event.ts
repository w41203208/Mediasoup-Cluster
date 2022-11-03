export class MEvent<T> {
  private _id: string;
  private _topic: string;
  private _payload: T;
  constructor(payload: T, topic: string) {
    const gID = new Date();
    this._id = gID.toISOString();
    this._payload = payload;
    this._topic = topic;
  }
  get id() {
    return this._id;
  }

  get topic() {
    return this._topic;
  }
  get payload() {
    return this._payload;
  }
}

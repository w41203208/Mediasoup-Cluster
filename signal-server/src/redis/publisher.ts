import { RedisClientType } from 'redis';
import { v4 } from 'uuid';
import { EventEmitter } from '../util/emitter';

export class Publisher extends EventEmitter {
  static Instance?: Publisher;
  private _id?: string;
  private _publisher?: RedisClientType;
  constructor(reidsClient: RedisClientType) {
    super();
    (async () => {
      this._id = v4();
      this._publisher = reidsClient.duplicate();
      await this._publisher.connect();
    })();
  }
  get id() {
    return this._id;
  }
  static createPublisher(reidsClient: RedisClientType) {
    if (this.Instance === undefined) {
      this.Instance = new Publisher(reidsClient);
    }
    return this.Instance;
  }

  publish(channelName: string, message: any) {
    this._publisher?.publish(channelName, JSON.stringify(message));
  }
}

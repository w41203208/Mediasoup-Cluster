import { RedisClientType } from 'redis';
import { v4 } from 'uuid';
import { EventEmitter } from '../util/emitter';

export class Subscriber extends EventEmitter {
  static Instance?: Subscriber;
  private _id: string;
  private _subscriber: RedisClientType;
  constructor(reidsClient: RedisClientType) {
    super();
    this._id = v4();
    this._subscriber = reidsClient.duplicate();
  }
  get id() {
    return this._id;
  }

  static createSubscriber(reidsClient: RedisClientType) {
    if (this.Instance === undefined) {
      this.Instance = new Subscriber(reidsClient);
    }
    console.log(this.Instance.id);
    return this.Instance;
  }

  subscribe(channelName: string) {
    this._subscriber.subscribe(channelName, (message: any) => {
      const jsonMessage = JSON.parse(message);
      this.emit('handleOnRoom', jsonMessage);
    });
  }
}

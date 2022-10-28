import { RedisClientType, WatchError } from 'redis';
import { v4 } from 'uuid';
import { EventEmitter } from '../util/emitter';

export class RoomRouter extends EventEmitter {
  private _id?: string;
  private _subscriber?: RedisClientType;
  private _publisher?: RedisClientType;
  constructor(reidsClient: RedisClientType) {
    super();
    (async () => {
      this._id = v4();
      this._subscriber = reidsClient.duplicate();
      await this._subscriber.connect();
      // this._subscriber = createClient({
      //   url: process.env.REDIS_HOST,
      // });
      // await this._subscriber.connect();
    })();
    (async () => {
      this._id = v4();
      this._publisher = reidsClient.duplicate();
      await this._publisher.connect();
    })();
  }
  get id() {
    return this._id;
  }
  publish(channelName: string, message: any) {
    this._publisher?.publish(channelName, JSON.stringify(message));
  }

  subscribe(channelName: string) {
    try {
      this._subscriber!.executeIsolated(async (isolatedClient: any) => {
        isolatedClient.subscribe(channelName, (message: any) => {
          const jsonMessage = JSON.parse(message);
          this.emit('handleOnRoom', jsonMessage);
        });
      });
    } catch (error) {
      if (error instanceof WatchError) {
        console.log(error);
      }
    }
  }
  unSubscribe(channelName: string) {
    try {
      this._subscriber!.executeIsolated(async (isolatedClient: any) => {
        isolatedClient.unsubscribe(channelName);
      });
    } catch (error) {
      if (error instanceof WatchError) {
        console.log(error);
      }
    }
  }

  register(channelName: string) {
    this.unSubscribe(channelName);
    this.subscribe(channelName);
  }
}

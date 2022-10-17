import { RedisClientType, createClient, SocketClosedUnexpectedlyError, WatchError } from 'redis';
import { v4 } from 'uuid';
import { EventEmitter } from '../util/emitter';

export class Subscriber extends EventEmitter {
  private _id?: string;
  private _subscriber?: RedisClientType;
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
  }
  get id() {
    return this._id;
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
}

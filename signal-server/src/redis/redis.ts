import { createClient, RedisClientType } from 'redis';
import { RedisClientOptions } from '../type.engine';

export class RedisClient {
  static Instance?: RedisClient;
  private client?: RedisClientType;
  constructor(option: RedisClientOptions) {
    (async () => {
      this.client = createClient({
        url: option.redisHost,
        isolationPoolOptions: {
          max: 10, // maximum size of the pool
          min: 2, // minimum size of the pool
        },
      });
      await this.client.connect();
    })();
  }

  get Client() {
    return this.client;
  }

  static GetInstance(option: RedisClientOptions) {
    if (this.Instance === undefined) {
      this.Instance = new RedisClient(option);
    }
    return this.Instance;
  }
}

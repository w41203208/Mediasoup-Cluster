import { createClient, RedisClientType } from 'redis';
import { RedisClientOptions } from '../type';

export class RedisClient {
  static Instance?: RedisClient;
  private client?: RedisClientType;
  constructor(option: RedisClientOptions) {
    (async () => {
      this.client = createClient({
        url: option.redisHost,
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

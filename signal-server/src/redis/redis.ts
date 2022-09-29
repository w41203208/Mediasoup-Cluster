import { createClient, RedisClientType } from 'redis';

export class RedisClient {
  static Instance?: RedisClient;
  private client?: RedisClientType;
  constructor() {
    (async () => {
      this.client = await this.createRedisClient();
    })();
  }

  get Client() {
    return this.client;
  }

  static GetInstance() {
    if (this.Instance === undefined) {
      this.Instance = new RedisClient();
    }
    return this.Instance;
  }
  createRedisClient(): Promise<RedisClientType> {
    return new Promise(async (resolve, reject) => {
      try {
        this.client = createClient({
          url: process.env.REDIS_HOST,
        });
        await this.client.connect();
        resolve(this.client);
      } catch (error) {
        console.log(error);
      }
    });
  }
}

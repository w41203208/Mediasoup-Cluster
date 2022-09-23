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

  static createInstance() {
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

  createRedisController(controllers: Array<any>): Promise<Record<string, any>> {
    return new Promise(async (resolve, reject) => {
      try {
        let c = {} as any;
        controllers.forEach((controller) => {
          c[controller.name] = new controller(this.client);
        });

        resolve(c);
      } catch (error) {
        console.log(error);
      }
    });
  }
}

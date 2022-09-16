import { ControllerImp } from './ControllerImp';

const redis = require('redis');

export function createRedisController(controllers: Array<any>): Promise<Record<string, ControllerImp>> {
  return new Promise(async (resolve, reject) => {
    try {
      const client = redis.createClient({
        url: process.env.REDIS_HOST,
      });
      await client.connect();
      let c = {} as any;
      controllers.forEach((controller) => {
        c[controller.name] = new controller(client);
      });

      resolve(c);
    } catch (error) {
      console.log(error);
    }
  });
}

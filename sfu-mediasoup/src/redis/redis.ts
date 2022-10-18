import { ControllerImp } from './ControllerImp';
const redis = require('redis');

export async function createRedisController(controllers: ControllerImp[]): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      const client = redis.createClient({
        url: process.env.REDIS_HOST,
      });
      await client.connect();
      client.select(process.env.REDIS_DB_INDEX);
      let c = {} as any;
      controllers.forEach((controller: any) => {
        c[controller.name] = new controller(client);
      });

      resolve(c);
    } catch (error) {
      console.log(error);
    }
  });
}

// class Test {
//   test() {}
// }

// class GG extends Test {}

// const hi = (tests: Test[]) => {};

// const gg: GG = {
//   test: () => {
//     return '';
//   },
// };
// hi([gg]);

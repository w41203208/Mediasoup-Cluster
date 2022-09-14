const redis = require('redis');

async function createRedisController(controllers) {
  return new Promise(async (resolve, reject) => {
    try {
      const client = redis.createClient({
        url: process.env.REDIS_HOST,
      });
      await client.connect();
      c = {};
      controllers.forEach((controller) => {
        c[controller.name] = new controller(client);
      });

      resolve(c);
    } catch (error) {
      console.log(error);
    }
  });
}

module.exports = {
  createRedisController: createRedisController,
};

const redis = require('redis');

async function createRedisController(controllers) {
  return new Promise(async (resolve, reject) => {
    try {
      const client = redis.createClient({
        url: 'redis://:test@127.0.0.1:6379',
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

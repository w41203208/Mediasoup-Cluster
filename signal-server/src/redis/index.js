const { createRedisController } = require('./redis.js');
const { RoomController } = require('./RoomController.js');
const { SFUServerController } = require('./SFUServerController.js');
const { PlayerController } = require('./PlayerController.js');

module.exports = {
  createRedisController: createRedisController,
  Controllers: [RoomController, SFUServerController, PlayerController],
};

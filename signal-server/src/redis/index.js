const { createRedisController } = require('./redis');
const { RoomController } = require('./RoomController');
const { SFUServerController } = require('./SFUServerController');
const { PlayerController } = require('./PlayerController');

module.exports = {
  createRedisController: createRedisController,
  Controllers: [RoomController, SFUServerController, PlayerController],
};

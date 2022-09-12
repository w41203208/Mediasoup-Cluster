const { createRedisController } = require('./redis');
const { RoomController } = require('./RoomController');
const { SFUServerController } = require('./SFUServerController');

module.exports = {
  createRedisController: createRedisController,
  Controllers: [RoomController, SFUServerController],
};

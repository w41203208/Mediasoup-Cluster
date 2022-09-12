const { ControllerImp } = require('./ControllerImp');
class RoomController extends ControllerImp {
  constructor(redisClient) {
    super();
    this._rc = redisClient;
  }

  set() {
    this._rc.hSet(
      'Room',
      'test',
      JSON.stringify({
        test: 'test',
      })
    );
  }
}

module.exports = {
  RoomController: RoomController,
};

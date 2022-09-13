const { ControllerImp } = require('./ControllerImp');
class PlayerController extends ControllerImp {
  constructor(redisClient) {
    super();
    this._rc = redisClient;
  }

  setPeer(id) {}
}

module.exports = {
  PlayerController: PlayerController,
};

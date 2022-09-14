const { ControllerImp } = require('./ControllerImp');
class PlayerController extends ControllerImp {
  constructor(redisClient) {
    super();
    this._rc = redisClient;
  }

  setPlayer(id) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!(await this.isPlayerExist(id))) {
          const data = await this._rc
            .multi()
            .hSet(
              'Player',
              id,
              this.transformToJSON({
                id: id,
                serverId: '',
                routerId: '',
              })
            )
            .hGet('Player', id)
            .exec();
          resolve(this.transformToJS(data[1]));
        } else {
          resolve(false);
        }
      } catch (error) {
        reject(error);
        console.log(error);
      }
    });
  }

  delPlayer(id) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!(await this.isPlayerExist(id))) {
          await this._rc.hSet(
            'Player',
            id,
            this.transformToJSON({
              id: id,
              serverId: '',
              routerId: '',
            })
          );
        }
      } catch (error) {
        reject(error);
        console.log(error);
      }
    });
  }

  isPlayerExist(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const exist = await this._rc.hExists('Player', id);
        resolve(exist);
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = {
  PlayerController: PlayerController,
};

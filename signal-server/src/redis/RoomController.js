const { ControllerImp } = require('./ControllerImp');
class RoomController extends ControllerImp {
  constructor(redisClient) {
    super();
    this._rc = redisClient;
  }

  setRoom(id) {
    // console.log(await client.exists('SFUServer', 'test'));
    return new Promise(async (resolve, reject) => {
      try {
        if (!(await this.isRoomExist(id))) {
          const data = await this._rc
            .multi()
            .hSet(
              'Room',
              id,
              this.transformToJSON({
                id: id,
                playerList: [],
                serverList: [],
                liveHoster: {},
                state: 'init',
              })
            )
            .hGet('Room', id)
            .exec();
          resolve(this.transformToJS(data[1]));
        } else {
          resolve(false);
        }
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  getRoom(id) {
    return new Promise(async (resolve, reject) => {
      try {
        if (await this.isRoomExist(id)) {
          const data = await this._rc.hGet('Room', id);
          resolve(this.transformToJS(data));
        } else {
          resolve(false);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  delRoom(id) {
    return new Promise(async (resolve, reject) => {
      try {
        if (await this.isRoomExist(id)) {
          await this._rc.hDel('Room', id, function (err) {
            if (err) {
              console.error('Failed to remove presence in redis: ' + err);
            }
          });
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  updateRoom(room) {
    return new Promise(async (resolve, reject) => {
      try {
        if (await this.isRoomExist(room.id)) {
          await this._rc.hSet('Room', room.id, this.transformToJSON(room));
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  isRoomExist(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const exist = await this._rc.hExists('Room', id);
        resolve(exist);
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = {
  RoomController: RoomController,
};

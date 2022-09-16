import { ControllerImp } from '../ControllerImp';
import { RedisClientType } from 'redis';

export class RoomController extends ControllerImp {
  constructor(redisClient: RedisClientType) {
    super(redisClient);
  }

  setRoom(id: string) {
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

  getRoom(id: string) {
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

  delRoom(id: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (await this.isRoomExist(id)) {
          await this._rc.hDel('Room', id);
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  updateRoom(room: any): Promise<void> {
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

  isRoomExist(id: string) {
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

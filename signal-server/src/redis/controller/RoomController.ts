import { ControllerImp } from '../ControllerImp';
import { RedisClientType } from 'redis';
import { RedisClient } from '../redis';

export class RoomController extends ControllerImp {
  static Instance?: RoomController;
  private _rc: RedisClientType;
  constructor(redisClient: RedisClientType) {
    super();
    this._rc = redisClient;
  }
  static GetInstance(rdc: RedisClientType) {
    if (this.Instance === undefined) {
      this.Instance = new RoomController(rdc);
    }
    return this.Instance;
  }
  getRoomSubscriberNum(channelName: string): Promise<number> {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this._rc.pubSubNumSub(channelName);
        resolve(data[channelName]);
      } catch (error) {
        reject(error);
      }
    });
  }

  setRoomProducer(id: string, pid: string): Promise<null> {
    return new Promise(async (resolve, reject) => {
      try {
        const key = `${id}.producerList`;
        await this._rc.lPush(key, pid);
        resolve(null);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  getRoomProducer(id: string): Promise<Array<string>> {
    return new Promise(async (resolve, reject) => {
      try {
        const key = `${id}.producerList`;
        const data = await this._rc.lRange(key, 0, -1);
        resolve(data);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  setRoom(id: string, name: string): Promise<false | Record<string, any>> {
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
                name: name,
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

  getRoom(id: string): Promise<any> {
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

  getAllRoom(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this._rc.hGetAll('Room');
        data
        const temp_list: Array<string> = [];
        Object.entries(data).forEach(([key, value]) => {
          temp_list.push(this.transformToJS(value));
        });
        resolve(temp_list);
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

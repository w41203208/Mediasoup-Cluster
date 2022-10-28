import { ControllerImp } from '../ControllerImp';
import { RedisClientType } from 'redis';

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

  setRoomProducerList(id: string, producerId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const key = `${id}.producerList`;
        await this._rc.hSet(key, producerId, producerId);
        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }
  getRoomProducerList(id: string): Promise<Array<string>> {
    return new Promise(async (resolve, reject) => {
      try {
        const key = `${id}.producerList`;
        let temp_list: Array<string> = [];
        const data = await this._rc.hGetAll(key);
        Object.entries(data).forEach(([key, value]) => {
          temp_list.push(value);
        });
        resolve(temp_list);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  setRoomServerList(id: string, serverId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const key = `${id}.serverList`;
        await this._rc.hSet(key, serverId, serverId);
        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  getRoomServerList(id: string): Promise<Array<string>> {
    return new Promise(async (resolve, reject) => {
      try {
        const key = `${id}.serverList`;
        let temp_list: Array<string> = [];
        const data = await this._rc.hGetAll(key);
        Object.entries(data).forEach(([key, value]) => {
          temp_list.push(value);
        });
        resolve(temp_list);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  setRoomPlayerList(id: string, playerId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const key = `${id}.playerList`;
        await this._rc.hSet(key, playerId, playerId);
        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  delRoomPlayerList(id: string, playerId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const key = `${id}.playerList`;
        await this._rc.hDel(key, playerId);
        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  setRoom(peerId: string, roomId: string, roomName: string): Promise<boolean> {
    // console.log(await client.exists('SFUServer', 'test'));
    return new Promise(async (resolve, reject) => {
      try {
        if (!(await this.isRoomExist(roomId))) {
          await this._rc.hSet(
            'Room',
            roomId,
            this.transformToJSON({
              id: roomId,
              name: roomName,
              owner: peerId,
            })
          );
          resolve(false);
        } else {
          resolve(true);
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

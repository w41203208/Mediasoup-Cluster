import { ControllerImp } from '../ControllerImp';
import { RedisClientType } from 'redis';

export class SFUServerController extends ControllerImp {
  private _rc: RedisClientType;
  constructor(redisClient: RedisClientType) {
    super();
    this._rc = redisClient;
  }

  getAllSFUServer() {
    return new Promise(async (resolve, reject) => {
      try {
        let temp_list: Array<string> = [];
        const servers = await this._rc.hGetAll('SFUServer');
        Object.entries(servers).forEach(([key, value]) => {
          temp_list.push(key);
        });
        resolve(temp_list);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  getSFUServerCount(id: string): Promise<number | void> {
    return new Promise(async (resolve, reject) => {
      try {
        const count = await this._rc.get(id);
        if (count) {
          resolve(Number(count));
        } else {
          resolve();
        }
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  addSFUServerCount(id: string): Promise<number | void> {
    return new Promise(async (resolve, reject) => {
      try {
        const count = await this._rc.INCRBY(id, 1);
        if (count) {
          resolve(Number(count));
        } else {
          resolve();
        }
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }
  reduceSFUServerCount(id: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        await this._rc.INCRBY(id, -1);
        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  isSFUServerIdExist(id: string) {
    return new Promise(async (resolve, reject) => {
      try {
        const exist = await this._rc.exists(id);
        resolve(exist);
      } catch (error) {
        reject(error);
      }
    });
  }

  set() {}
}

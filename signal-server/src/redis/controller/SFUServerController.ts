import { ControllerImp } from '../ControllerImp';
import { RedisClientType } from 'redis';

export class SFUServerController extends ControllerImp {
  static Instance?: SFUServerController;
  private _rc: RedisClientType;
  constructor(redisClient: RedisClientType) {
    super();
    this._rc = redisClient;
  }

  static GetInstance(rdc: RedisClientType) {
    if (this.Instance === undefined) {
      this.Instance = new SFUServerController(rdc);
    }
    return this.Instance;
  }

  getAllSFUServer() {
    return new Promise(async (resolve, reject) => {
      try {
        let temp_list: Array<string> = [];
        const data = await this._rc.hGetAll('SFUServerList');
        Object.entries(data).forEach(([key, value]) => {
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
        const count = await this._rc.hGet('SFUServerList', id);
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
        const count = await this._rc.hIncrBy('SFUServerList', id, 1);
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
        const count = await this._rc.hIncrBy('SFUServerList', id, -1);
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
        const exist = await this._rc.hExists('SFUServerList', id);
        resolve(exist);
      } catch (error) {
        reject(error);
      }
    });
  }
}

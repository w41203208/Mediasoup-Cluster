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
        const data = await this._rc.lRange('SFUServerList', 0, -1);
        resolve(data);
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

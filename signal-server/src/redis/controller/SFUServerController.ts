import { ControllerImp } from '../ControllerImp';
import { RedisClientType } from 'redis';

export class SFUServerController extends ControllerImp {
  constructor(redisClient: RedisClientType) {
    super(redisClient);
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

  getSFUServerCount(id: string) {
    return new Promise(async (resolve, reject) => {
      try {
        const count = await this._rc.get(id);

        resolve(count);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  addSFUServerCount(id: string) {
    return new Promise(async (resolve, reject) => {
      try {
        const count = await this._rc.INCRBY(id, 1);
        resolve(count);
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

  set() {}
}

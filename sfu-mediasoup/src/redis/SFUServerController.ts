import { ControllerImp } from './ControllerImp';

import { RedisClientType } from 'redis';

export class SFUServerController extends ControllerImp {
  private _rc: RedisClientType;
  constructor(redisClient: RedisClientType) {
    super();
    this._rc = redisClient;
    // this.testInit();
  }

  getSFUServer(id: string) {
    return new Promise(async (resolve, reject) => {
      try {
        if (await this.isSFUServerExist(id)) {
          const data = await this._rc.hGet('SFUServer', id);
          resolve(this.transformToJS(data));
        } else {
          resolve(false);
        }
      } catch (error) {
        reject(error);
        console.log(error);
      }
    });
  }

  setSFUServer(id: string) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!(await this.isSFUServerExist(id))) {
          await this._rc.SET(id, 0);
          const data = await this._rc
            .multi()
            .hSet(
              'SFUServer',
              id,
              this.transformToJSON({
                id: id,
                count: 0,
              })
            )
            .hGet('SFUServer', id)
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

  isSFUServerExist(id: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        const exist = await this._rc.hExists('SFUServer', id);
        resolve(exist);
      } catch (error) {
        reject(error);
      }
    });
  }
}

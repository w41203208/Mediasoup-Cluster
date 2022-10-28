import { ControllerImp } from '../ControllerImp';

import { RedisClientType } from 'redis';

export class SFUServerController extends ControllerImp {
  static Instance?: SFUServerController;
  private _rc: RedisClientType;
  constructor(redisClient: RedisClientType) {
    super();
    this._rc = redisClient;
    // this.testInit();
  }
  static GetInstance(rdc: RedisClientType) {
    if (this.Instance === undefined) {
      this.Instance = new SFUServerController(rdc);
    }
    return this.Instance;
  }

  setSFUServer(id: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        await this._rc.hSet('SFUServerList', id, 0);
        resolve();
      } catch (error) {
        reject(error);
        console.log(error);
      }
    });
  }
}

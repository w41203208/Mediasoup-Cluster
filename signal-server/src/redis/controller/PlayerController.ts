import { ControllerImp } from '../ControllerImp';
import { RedisClientType } from 'redis';

export class PlayerController extends ControllerImp {
  static Instance?: PlayerController;
  private _rc: RedisClientType;
  constructor(redisClient: RedisClientType) {
    super();
    this._rc = redisClient;
  }
  static GetInstance(rdc: RedisClientType) {
    if (this.Instance === undefined) {
      this.Instance = new PlayerController(rdc);
    }
    return this.Instance;
  }

  getPlayer(id: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        if (await this.isPlayerExist(id)) {
          const data = await this._rc.hGet('Player', id);
          resolve(this.transformToJS(data));
        } else {
          resolve(false);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  setPlayer(id: string): Promise<boolean | any> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!(await this.isPlayerExist(id))) {
          const data = await this._rc
            .multi()
            .hSet(
              'Player',
              id,
              this.transformToJSON({
                id: id,
                serverId: '',
                routerId: '',
              })
            )
            .hGet('Player', id)
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

  delPlayer(id: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (await this.isPlayerExist(id)) {
          await this._rc.hDel('Player', id);
        }
        resolve();
      } catch (error) {
        reject(error);
        console.log(error);
      }
    });
  }

  updatePlayer(player: any): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (await this.isPlayerExist(player.id)) {
          await this._rc.hSet('Player', player.id, this.transformToJSON(player));
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  isPlayerExist(id: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        const exist = await this._rc.hExists('Player', id);
        resolve(exist);
      } catch (error) {
        reject(error);
      }
    });
  }
}

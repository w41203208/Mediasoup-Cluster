import { RedisClientType } from 'redis';
export class ControllerImp {
  protected _rc: RedisClientType;
  constructor(redisClient: RedisClientType) {
    this._rc = redisClient;
  }
  transformToJSON(data: any) {
    return JSON.stringify(data);
  }
  transformToJS(data: any) {
    return JSON.parse(data);
  }
}

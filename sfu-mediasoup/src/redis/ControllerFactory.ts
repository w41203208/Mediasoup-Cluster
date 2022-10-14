import { SFUServerController } from './controller/SFUServerController';
import { RedisClient } from './redis';

enum ControllerType {
  Room = 'Room',
  Player = 'Player',
  SFU = 'SFU',
}

export class ControllerFactory {
  static Instance?: ControllerFactory;
  private redisClient: RedisClient;
  constructor(redisClient: RedisClient) {
    this.redisClient = redisClient;
  }

  static GetInstance(redisClient: RedisClient) {
    if (this.Instance === undefined) {
      this.Instance = new ControllerFactory(redisClient);
    }
    return this.Instance;
  }

  getControler(type: string) {
    let controller;
    switch (type) {
      case ControllerType.SFU:
        controller = SFUServerController.GetInstance(this.redisClient.Client!);
        break;
    }
    return controller;
  }
}

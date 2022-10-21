import { ControllerFactory } from '../redis/ControllerFactory';
import { RoomController } from '../redis/controller';

import { Room } from './Room';

class RoomManager {
  private RoomController: RoomController;

  private _roomMap: Map<string, Room>;

  constructor(cf: ControllerFactory) {
    this.RoomController = cf.getController('Room') as RoomController;

    this._roomMap = new Map();
  }

  getOrCreateRoom(id: string) {
    return this._roomMap.get(id);
  }
}

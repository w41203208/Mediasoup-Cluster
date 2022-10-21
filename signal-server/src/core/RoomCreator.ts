import { ControllerFactory } from '../redis/ControllerFactory';
import { RoomController } from '../redis/controller';

class RoomCreator {
  private _roomController: RoomController;
  constructor(cf: ControllerFactory) {
    this._roomController = cf.getController('Room') as RoomController;
  }

  createRoom(id: string) {}
}

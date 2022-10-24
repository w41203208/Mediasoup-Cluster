import { ControllerFactory } from '../redis/ControllerFactory';
import { RoomController } from '../redis/controller';

export class RoomCreator {
  private _roomController: RoomController;
  constructor(cf: ControllerFactory) {
    this._roomController = cf.getController('Room') as RoomController;
  }

  async createRoom(peerId: string, roomId: string, roomName: string) {
    try {
      const rRoom = await this._roomController.setRoom(roomId, roomName);
      if (rRoom) {
        rRoom.host = {
          id: peerId,
          producerIdList: [],
        };
        await this._roomController.updateRoom(rRoom);

        return true;
      } else {
        return false;
      }
    } catch (e: any) {}
  }
}

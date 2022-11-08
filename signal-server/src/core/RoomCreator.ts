import { ControllerFactory } from '../redis/ControllerFactory';
import { RoomController } from '../redis/controller';

export class RoomCreator {
	private _roomController: RoomController;
	constructor(cf: ControllerFactory) {
		this._roomController = cf.getController('Room') as RoomController;
	}

	async createRoom(peerId: string, roomId: string, roomName: string) {
		const isExist = await this._roomController.setRoom(peerId, roomId, roomName);
		return isExist;
	}
}

import { PlayerController } from './controller/PlayerController';
import { RoomController } from './controller/RoomController';
import { SFUServerController } from './controller/SFUServerController';
import { RedisClient } from './redis';
import { ControllerImp } from './ControllerImp';

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

	getController(type: string) {
		let controller;
		switch (type) {
			case ControllerType.Room:
				controller = RoomController.GetInstance(this.redisClient.Client!);
				break;
			case ControllerType.Player:
				controller = PlayerController.GetInstance(this.redisClient.Client!);
				break;
			case ControllerType.SFU:
				controller = SFUServerController.GetInstance(this.redisClient.Client!);
				break;
		}
		return controller;
	}
}

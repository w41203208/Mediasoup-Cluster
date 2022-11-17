// config
import { config } from '../config';

// other;
import { EngineOptions, HttpsServerOptions, RedisClientOptions } from './type.engine';

// object
import { HttpsServer } from './connect/HttpsServer';
import { WSServer } from './connect/WSServer';
import { RedisClient } from './redis/redis';
import { SFUConnectionManager } from './core/SFUConnectionManager';
import { ControllerFactory } from './redis/ControllerFactory';
import { Log } from './util/Log';
import { RoomService, AuthService, SFUService } from './service';
import { ClientConnectionManager } from './core/ClientConnectionManager';
import { CryptoCore } from './util/CryptoCore';
import { RoomCreator } from './core/RoomCreator';
import { RoomManager } from './core/RoomManager';
import { RoomRouter } from './core/RoomRouter';

import { SFUAllocator } from './core/SFUAllocator';
import { PeerRouter } from './router/peerRouter';

export class ServerEngine {
	/* settings */
	private _httpsServerOption: HttpsServerOptions;
	private _redisClientOption: RedisClientOptions;

	constructor({ httpsServerOption, redisClientOption }: EngineOptions) {
		this._httpsServerOption = httpsServerOption;
		this._redisClientOption = redisClientOption;

		Log.setLogLevel('DEBUG');
	}

	run() {
		const cryptoCore = new CryptoCore(config.ServerSetting.cryptoKey);

		const rcClient = RedisClient.GetInstance(this._redisClientOption);
		const controllerFactory = ControllerFactory.GetInstance(rcClient);
		const sfuAllocator = new SFUAllocator(controllerFactory);
		const sfuConnectionMgr = new SFUConnectionManager();
		const clientConnectionMgr = new ClientConnectionManager();

		const peerRouter = new PeerRouter();
		peerRouter.addTopic('signal');
		peerRouter.addTopic('rtc');
		const roomRouter = new RoomRouter(rcClient.Client!);

		const roomCreator = new RoomCreator(controllerFactory);

		const roomService = new RoomService(roomCreator, controllerFactory, cryptoCore);
		const authService = new AuthService(cryptoCore);
		const sfuService = new SFUService(sfuConnectionMgr);

		// eslint-disable-next-line no-unused-vars
		const roomMgr = new RoomManager(controllerFactory, roomRouter, peerRouter, sfuService);
		const httpsServer = new HttpsServer(this._httpsServerOption, cryptoCore, roomService, authService);

		// eslint-disable-next-line no-unused-vars
		const websocketServer = new WSServer(httpsServer.run().runToHttps(), cryptoCore, clientConnectionMgr, sfuAllocator, peerRouter);

		// websocketServer.on('connection', (id: string, getTransport: Function) => {
		//   const peerTransport = getTransport();
		//   const peer = new Peer(id, peerTransport, roomService, peerRouter);
		//   const bomb = new TimeBomb(10 * 1000);
		//   peer.setTimeBomb(bomb);
		//   clientConnectionMgr.setPeer(peer);
		// });

		return true;
	}
}

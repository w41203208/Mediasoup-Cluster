// config
import { config } from '../config';
// other;
import { EngineOptions, HttpsServerOptions, RedisClientOptions } from './type.engine';
// object
import { HttpsServer } from './connect/HttpsServer';
import { WSServer } from './connect/WSServer';
import { Peer } from './core/Peer';
import { Room } from './core/Room';
import { RedisClient } from './redis/redis';
import { SFUConnectionManager } from './core/SFUConnectionManager';
import { ControllerFactory } from './redis/ControllerFactory';
import { Log } from './util/Log';
import { CommonService, AuthService, RoomService } from './service';
import { ClientConnectionManager } from './core/ClientConnectionManager';
import { CryptoCore } from './util/CryptoCore';
import { RoomCreator } from './core/RoomCreator';
import { RoomManager } from './core/RoomManager';
import { RoomRouter } from './core/RoomRouter';
import { TimeBomb } from './util/TimeBomb';
import { SFUService } from './service/sfuService';
import { SFUAllocator } from './core/SFUAllocator';
import { PeerRouter } from './router/peerRouter';
import { RoomManagerSubscriber } from './router/subscriber';

export class ServerEngine {
  /* settings */
  private _httpsServerOption: HttpsServerOptions;
  private _redisClientOption: RedisClientOptions;
  /* roomlist */
  private _roomList: Map<string, Room>;

  constructor({ httpsServerOption, redisClientOption }: EngineOptions) {
    this._httpsServerOption = httpsServerOption;
    this._redisClientOption = redisClientOption;

    Log.setLogLevel('DEBUG');
    this._roomList = new Map();
  }

  get roomList() {
    return this._roomList;
  }

  async run() {
    const rcClient = RedisClient.GetInstance(this._redisClientOption);
    const controllerFactory = ControllerFactory.GetInstance(rcClient);
    const sfuAllocator = new SFUAllocator(controllerFactory);
    const sfuConnectionMgr = new SFUConnectionManager();
    const sfuService = new SFUService(sfuConnectionMgr);

    const peerRouter = new PeerRouter();
    peerRouter.addTopic('signal');
    peerRouter.addTopic('rtc');
    const roomRouter = new RoomRouter(rcClient.Client!);

    const clientConnectionMgr = new ClientConnectionManager();
    const cryptoCore = new CryptoCore(config.ServerSetting.cryptoKey);
    const roomCreator = new RoomCreator(controllerFactory);
    const commonService = new CommonService(roomCreator, controllerFactory, cryptoCore);
    const authService = new AuthService(cryptoCore);
    const httpsServer = new HttpsServer(this._httpsServerOption, cryptoCore, commonService, authService);

    const roomMgr = new RoomManager(controllerFactory, roomRouter, peerRouter);
    const roomService = new RoomService(
      controllerFactory,
      cryptoCore,
      roomCreator,
      roomRouter,
      roomMgr,
      clientConnectionMgr,
      sfuAllocator,
      sfuService
    );
    const websocketServer = new WSServer(httpsServer.run().runToHttps(), cryptoCore);

    websocketServer.on('connection', (id: string, getTransport: Function) => {
      const peerTransport = getTransport();
      const peer = new Peer(id, peerTransport, roomService, peerRouter);
      const bomb = new TimeBomb(10 * 1000);
      peer.setTimeBomb(bomb);
      clientConnectionMgr.setPeer(peer);
    });
  }
}

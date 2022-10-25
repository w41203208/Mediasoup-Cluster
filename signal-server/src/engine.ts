//package
import { v4 } from 'uuid';
// config
import { config } from '../config';
// other
import { EVENT_FOR_SFU, EVENT_FROM_CLIENT_REQUEST } from './EVENT';
import { EngineOptions, HttpsServerOptions, RedisClientOptions, RoomOptions } from './type.engine';
// object
import { HttpsServer } from './connect/HttpsServer';
import { WSServer } from './connect/WSServer';
import { Peer } from './core/Peer';
import { Room } from './core/Room';
import { RedisClient } from './redis/redis';
import { SFUConnectionManager } from './core/SFUConnectionManager';
import { ControllerFactory } from './redis/ControllerFactory';
import { PlayerController, RoomController } from './redis/controller';
import { Log } from './util/Log';
import { CommonService, AuthService, RoomService } from './service';
import { ClientConnectionManager } from './core/ClientConnectionManager';
import { CryptoCore } from './util/CryptoCore';
import { RoomCreator } from './core/RoomCreator';
import { RoomManager } from './core/RoomManager';
import { TimeBomb } from './util/TimeBomb';

export class ServerEngine {
  /* settings */
  private _httpsServerOption: HttpsServerOptions;
  private _redisClientOption: RedisClientOptions;
  private _roomOption: RoomOptions;
  /* roomlist */
  private _roomList: Map<string, Room>;
  /* redisClient */
  private redisClient?: RedisClient;
  /* log */
  private log: Log = Log.GetInstance();

  constructor({ httpsServerOption, redisClientOption, roomOption }: EngineOptions) {
    this._httpsServerOption = httpsServerOption;
    this._redisClientOption = redisClientOption;
    this._roomOption = roomOption;

    this._roomList = new Map();
  }

  get roomList() {
    return this._roomList;
  }

  async run() {
    this.redisClient = RedisClient.GetInstance(this._redisClientOption);
    const controllerFactory = ControllerFactory.GetInstance(this.redisClient);
    const sfuConnectionMgr = new SFUConnectionManager(this, controllerFactory);
    const clientConnectionMgr = new ClientConnectionManager();
    const cryptoCore = new CryptoCore(config.ServerSetting.cryptoKey);
    const commonService = new CommonService(controllerFactory, cryptoCore);
    const authService = new AuthService(cryptoCore);
    const httpsServer = new HttpsServer(this._httpsServerOption, cryptoCore, commonService, authService);
    const roomCreator = new RoomCreator(controllerFactory);
    const roomMgr = new RoomManager(controllerFactory);
    const roomService = new RoomService(cryptoCore, roomCreator, sfuConnectionMgr, roomMgr, controllerFactory);
    const websocketServer = new WSServer(httpsServer.run().runToHttps(), cryptoCore);

    websocketServer.on('connection', (id: string, getTransport: Function) => {
      const peerTransport = getTransport();
      const peer = new Peer(id, peerTransport, roomService);
      const bomb = new TimeBomb(10 * 1000);
      peer.setTimeBomb(bomb);
      clientConnectionMgr.setPeer(peer);
    });
  }

  // handleServerSocketRequest(type: string, data: any, response: Function) {
  //   const { room_id } = data;
  //   if (!this.roomList.has(room_id)) {
  //     return;
  //   }
  //   const room = this.roomList.get(room_id)!;

  //   room.handleServerSocketRequest(type, data, response);
  // }
}

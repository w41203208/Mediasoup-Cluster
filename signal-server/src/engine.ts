import { HttpsServer } from './connect/HttpsServer';
import { WSServer } from './connect/WSServer';
import { Peer } from './core/Peer';
import { Room } from './core/Room';
import { RedisClient } from './redis/redis';
import { EngineOptions, HttpsServerOptions, RedisClientOptions } from './type';
import { SFUConnectionManager } from './core/SFUConnectionManager';
import { config } from '../config';
import { SFUServer } from './core/SFUServer';
import { EVENT_FOR_SFU, EVENT_FROM_CLIENT_REQUEST } from './EVENT';
import { ControllerFactory } from './redis/ControllerFactory';
import { PlayerController, RoomController } from './redis/controller';
import { v4 } from 'uuid';
import { CryptoCore } from './util/CryptoCore';

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

export class ServerEngine {
  /* settings */
  private _httpsServerOption: HttpsServerOptions;
  private _redisClientOption: RedisClientOptions;

  /* roomlist */
  private _roomList: Map<string, Room>;

  /* redis */
  private _controllerFactory?: ControllerFactory;

  /* sfuConnectionManager */
  private sfuServerConnection?: SFUConnectionManager;

  /* redisClient */
  private redisClient?: RedisClient;

  constructor({ httpsServerOption, redisClientOption }: EngineOptions) {
    this._httpsServerOption = httpsServerOption;
    this._redisClientOption = redisClientOption;

    this._roomList = new Map();
  }

  get roomList() {
    return this._roomList;
  }

  async run() {
    this.redisClient = RedisClient.GetInstance(this._redisClientOption);
    this._controllerFactory = ControllerFactory.GetInstance(this.redisClient);
    this.sfuServerConnection = new SFUConnectionManager(this, this._controllerFactory!);

    const cryptoCore = new CryptoCore(config.ServerSetting.cryptoKey);

    const httpsServer = new HttpsServer(this._httpsServerOption, this, cryptoCore);

    const websocketServer = new WSServer(httpsServer.run().runToHttps(), cryptoCore);

    websocketServer.on('connection', (getTransport: Function) => {
      const peerTransport = getTransport();
<<<<<<< HEAD
      new Peer("", "", peerTransport, this, cryptoCore);
=======
      // const uuId = httpsServer.cryptoCore.decipherIv(httpsServer.uuId);
      new Peer(v4(), '', peerTransport, this);
>>>>>>> jay_dev
    });
  }

  handlePeerRequest(type: string, data: any, response: Function) {
    switch (type) {
      case EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM:
        this.handleCreateRoom(data, response);
        break;
      case EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM:
        this.handleJoinRoom(data, response);
        break;
    }
  }

  handleServerSocketRequest(type: string, data: any, response: Function) {
    const { room_id } = data;
    if (!this.roomList.has(room_id)) {
      return;
    }
    const room = this.roomList.get(room_id)!;

    room.handleServerSocketRequest(type, data, response);
  }

  async handleCreateRoom(data: any, response: Function) {
    const RoomController = this._controllerFactory?.getControler('Room') as RoomController;
    const { room_name, peer_id } = data;

    console.log('User [%s] create room [%s].', peer_id, room_name);
    const room_id = Date.now() + ':' + v4();
    const rRoom = await RoomController.setRoom(room_id, room_name);

    let responseData;
    if (rRoom) {
      rRoom.host = {
        id: peer_id,
        producerIdList: [],
      };
      await RoomController.updateRoom(rRoom);
      responseData = {
        msg: 'Successfully create!',
        room_id: room_id,
        state: true,
      };
    } else {
      responseData = {
        msg: 'already exists!',
        state: false,
      };
    }

    response({
      type: EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM,
      data: responseData,
    });
  }

  async handleJoinRoom(data: any, response: Function) {

    const RoomController = this._controllerFactory?.getControler('Room') as RoomController;
    const PlayerController = this._controllerFactory?.getControler('Player') as PlayerController;
    const { room_id, peer } = data;
    console.log('User [%s] join room [%s].', peer.id, room_id);

    const rRoom = await RoomController.getRoom(room_id);
    let responseData;
    if (rRoom) {
      // 建立或取得 localRoom
      let room: Room;
      console.log(this.roomList);
      if (this.roomList.has(room_id)) {
        room = this.roomList.get(room_id)!;
      } else {
        room = new Room({
          roomId: rRoom.id,
          roomName: rRoom.name,
          roomOwner: rRoom.host.id,
          mediaCodecs: config.MediasoupSetting.router.mediaCodecs,
          sfuConnectionManager: this.sfuServerConnection!,
          redisClient: this.redisClient!,
          controllerFactory: this._controllerFactory!,
          listener: this,
        });
        this.roomList.set(room.id, room);
      }

      // 選擇適合的SFUServer建立Websocket連線，從local取得 或是 創建新的連線

      const ip_port = await this.sfuServerConnection!.getMinimumSFUServer();
      if (ip_port === undefined) {
        responseData = {
          msg: 'Server is full',
        };
        response({
          type: EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM,
          data: responseData,
        });
        return;
      }

      console.log('User [%s] choose [%s] sfuserver.', peer.id, ip_port);

      const localServerId = ip_port;
      const localServerSocket = await this.sfuServerConnection!.connectToSFUServer(localServerId, room_id);

      // new SFUServer，SFUServer 添加到 room
      const sfuServer = new SFUServer(localServerId);
      room.addSFUServer(sfuServer);
      // 添加 SFUServer port 給 peer
      peer.serverId = localServerId;

      // Update room data with serverList in redis.
      const isExist = rRoom.serverList.indexOf(localServerId);
      if (isExist === -1) {
        rRoom.serverList.push(localServerId);
      }

      // Peer 添加到 room
      room.addPeer(peer);
      rRoom.playerList.push(peer.id);
      const rPeer = await PlayerController.setPlayer(peer.id);

      console.log(rPeer);
      console.log(localServerId);
      rPeer.serverId = localServerId;
      // 改變 room 狀態 init -> public
      if (rRoom.host.id === peer.id) {
        rRoom.state = 'public';
      }

      // update room data in redis
      await RoomController.updateRoom(rRoom);

      localServerSocket
        .request({
          data: {
            room_id: room_id,
            mediaCodecs: config.MediasoupSetting.router.mediaCodecs,
          },
          type: EVENT_FOR_SFU.CREATE_ROUTER,
        })
        .then(async ({ data }) => {
          const { router_id } = data;
          console.log('User [%s] get router [%s]', peer.id, router_id);

          room.addRouter(router_id);
          peer.routerId = router_id;
          rPeer.routerId = router_id;

          await PlayerController.updatePlayer(rPeer);

          /* create and connect pipeTransport */
          const remoteServerSocketIdList = rRoom.serverList.filter((serverId: string) => {
            if (serverId !== localServerId) {
              return serverId;
            }
          });
          console.log(remoteServerSocketIdList);
          if (remoteServerSocketIdList.length !== 0) {
            remoteServerSocketIdList.forEach(async (serverId: string) => {
              const remoteServerSocket = await this.sfuServerConnection!.connectToSFUServer(serverId, room_id);
              const [remoteConnectionData, localConnectionData] = await Promise.all([
                remoteServerSocket.request({
                  data: {
                    server_id: localServerId,
                    mediaCodecs: config.MediasoupSetting.router.mediaCodecs,
                  },
                  type: EVENT_FOR_SFU.CREATE_PIPETRANSPORT,
                }),
                localServerSocket.request({
                  data: {
                    server_id: serverId,
                    mediaCodecs: config.MediasoupSetting.router.mediaCodecs,
                  },
                  type: EVENT_FOR_SFU.CREATE_PIPETRANSPORT,
                }),
              ]);
              const { transport_id: remoteTransportId, state: remoteState, ...remoteRest } = remoteConnectionData.data;
              const { transport_id: localTransportId, state: localState, ...localRest } = localConnectionData.data;
              /* 這裡理論state 回傳只會兩個都是 false or 都是 true */
              // console.log('remoteState', remoteState);
              // console.log('localState', localState);
              let promiseList = [];
              if (!remoteState) {
                promiseList.push(
                  remoteServerSocket.request({
                    data: {
                      localTransport_id: remoteTransportId,
                      remoteTransport_id: localTransportId,
                      server_id: localServerId,
                      ...localRest,
                    },
                    type: EVENT_FOR_SFU.CONNECT_PIPETRANSPORT,
                  })
                );
              }
              if (!localState) {
                promiseList.push(
                  localServerSocket.request({
                    data: {
                      localTransport_id: localTransportId,
                      remoteTransport_id: remoteTransportId,
                      server_id: serverId,
                      ...remoteRest,
                    },
                    type: EVENT_FOR_SFU.CONNECT_PIPETRANSPORT,
                  })
                );
              }
              const promiseData = await Promise.all(promiseList);
            });
          }
          responseData = {
            room_id: room.id,
            room_user_size: room.getAllPeers().size
          };
          response({
            type: EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM,
            data: responseData,
          });
        });
    } else {
      responseData = {
        msg: 'This room is not exist!',
      };
      response({
        type: EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM,
        data: responseData,
      });
    }
  }

  deleteRoom(id: string) {
    this.roomList.delete(id);
  }
}

// import { TEST } from './worker/workerTest';

// TEST();

import { HttpsServer } from './run/HttpsServer';
import { WSServer } from './run/WSServer';
import { Peer } from './common/peer';
import { Room } from './common/room';
import { createRedisController } from './redis/redis';
import { ControllerLoader } from './redis/ControllerLoader';
import { EngineOptions, HttpsServerOptions } from './type';
import { SFUConnectionManager } from './run/SFUConnectionManager';
import { config } from '../config';
import { v4 } from 'uuid';
import { SFUServer } from './common/SFUServer';
import { SFUServerSocket } from './common/SFUServerSocket';

const EVENT_FROM_CLIENT_REQUEST = {
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  GET_PRODUCERS: 'getProducers',
  GET_ROUTER_RTPCAPABILITIES: 'getRouterRtpCapabilities',
  CREATE_WEBRTCTRANSPORT: 'createWebRTCTransport',
  CONNECT_WEBRTCTRANPORT: 'connectWebRTCTransport',
  PRODUCE: 'produce',
  CONSUME: 'consume',
  GET_ROOM_INFO: 'getRoomInfo',
  LEAVE_ROOM: 'leaveRoom',
  CLOSE_ROOM: 'closeRoom',
};

const EVENT_FOR_CLIENT_NOTIFICATION = {
  NEW_CONSUMER: 'newConsumer',
};

const EVENT_FOR_SFU = {
  CREATE_ROUTER: 'createRouter',
  GET_ROUTER_RTPCAPABILITIES: 'getRouterRtpCapabilities',
  CREATE_WEBRTCTRANSPORT: 'createWebRTCTransport',
  CONNECT_WEBRTCTRANPORT: 'connectWebRTCTransport',
  CREATE_PRODUCE: 'createProduce',
  CREATE_CONSUME: 'createConsume',
  CREATE_PIPETRANSPORT: 'createPipeTransport',
  CONNECT_PIPETRANSPORT: 'connectPipeTransport',
};

export class ServerEngine {
  /* settings */
  private _httpsServerOption: HttpsServerOptions;

  /* roomlist */
  private roomList: Map<string, Room>;

  /* redis */
  private redisControllers?: Record<string, any>;

  /* sfuConnectionManager */
  private sfuServerConnection?: SFUConnectionManager;
  constructor({ httpsServerOption }: EngineOptions) {
    this._httpsServerOption = httpsServerOption;

    this.roomList = new Map();
  }

  async run() {
    this.redisControllers = await createRedisController(await ControllerLoader.bootstrap());
    this.sfuServerConnection = new SFUConnectionManager({
      ...this.redisControllers,
    });

    const httpsServer = new HttpsServer(this._httpsServerOption, this);

    const websocketServer = new WSServer(httpsServer.run().runToHttps());

    websocketServer.on('connection', (getTransport: Function) => {
      const peerTransport = getTransport();

      const peer = new Peer(v4(), '', peerTransport, this);
    });
  }

  handleRequest(type: string, data: any, response: Function) {
    switch (type) {
      case EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM:
        this.handleCreateRoom(data, response);
        break;
      case EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM:
        this.handleJoinRoom(data, response);
        break;
    }
  }

  async handleCreateRoom(data: any, response: Function) {
    const { RoomController } = this.redisControllers!;
    const { room_id, peer_id } = data;
    console.log('User [%s] create room [%s].', peer_id, room_id);

    const rRoom = await RoomController.setRoom(room_id);

    let responseData;
    if (rRoom) {
      rRoom.host = {
        id: peer_id,
        producerIdList: [],
      };
      await RoomController.updateRoom(rRoom);
      responseData = {
        msg: 'Successfully create!',
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
    const { RoomController, PlayerController } = this.redisControllers!;
    const { room_id, peer } = data;
    console.log('User [%s] join room [%s].', peer.id, room_id);

    const rRoom = await RoomController.getRoom(room_id);
    let responseData;
    if (rRoom) {
      // 建立或取得 localRoom
      let room: Room;
      if (this.roomList.has(room_id)) {
        room = this.roomList.get(room_id)!;
      } else {
        room = new Room(
          rRoom.id,
          config.MediasoupSetting.router.mediaCodecs,
          this.sfuServerConnection!,
          {
            ...this.redisControllers,
          }, // 兩個留一個
          this // 兩個留一個
        );
        this.roomList.set(room.id, room);
      }

      // 選擇適合的SFUServer建立Websocket連線，從local取得 或是 創建新的連線

      const ip_port = await this.sfuServerConnection!.getMinimumSFUServer();

      console.log('User [%s] choose [%s] sfuserver.', peer.id, ip_port);

      const serverSocket = await this.sfuServerConnection!.connectToSFUServer(ip_port, room_id);

      // new SFUServer，SFUServer 添加到 room
      const sfuServer = new SFUServer(ip_port);
      room.addSFUServer(sfuServer);
      // 添加 SFUServer port 給 peer
      peer.serverId = ip_port;

      // Update room data with serverList in redis.
      const isExist = rRoom.serverList.indexOf(ip_port);
      if (isExist === -1) {
        rRoom.serverList.push(ip_port);
      }

      // Peer 添加到 room
      room.addPeer(peer);
      rRoom.playerList.push(peer.id);
      const rPeer = await PlayerController.setPlayer(peer.id);

      rPeer.serverId = ip_port;
      // 改變 room 狀態 init -> public
      if (rRoom.host.id === peer.id) {
        rRoom.state = 'public';
      }
      // 判斷與 LiveHoster 的關係
      // let remoteServerSocket: SFUServerSocket | null = null;
      // const hoster = await PlayerController.getPlayer(rRoom.host.id);
      // if (ip_port !== hoster.serverId && hoster.serverId !== '') {
      //   remoteServerSocket = await this.sfuServerConnection!.connectToSFUServer(hoster.serverId, room_id);
      // }

      // update room data in redis
      await RoomController.updateRoom(rRoom);
      serverSocket
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

          // remoteServerSocket 存在，代表在不同的 sfu host
          // if (remoteServerSocket) {
          //   const [remoteConnectionData, localConnectionData] = await Promise.all([
          //     remoteServerSocket.sendData({
          //       data: {
          //         router_id: hoster.routerId,
          //         server_id: hoster.serverId,
          //       },
          //       type: EVENT_FOR_SFU.CREATE_PIPETRANSPORT,
          //     }),
          //     serverSocket.sendData({
          //       data: {
          //         router_id: router_id,
          //         server_id: ip_port,
          //       },
          //       type: EVENT_FOR_SFU.CREATE_PIPETRANSPORT,
          //     }),
          //   ]);
          //   const { transport_id: remoteTransportId, remoteState, ...remoteRest } = remoteConnectionData;
          //   const { transport_id: localTransportId, localState, ...localRest } = localConnectionData;
          //   let promiseList = [];
          //   if (!remoteState) {
          //     promiseList.push(
          //       remoteServerSocket.sendData({
          //         data: {
          //           transport_id: remoteTransportId,
          //           ...localRest,
          //         },
          //         type: EVENT_FOR_SFU.CONNECT_PIPETRANSPORT,
          //       })
          //     );
          //   }
          //   if (!localState) {
          //     promiseList.push(
          //       serverSocket.sendData({
          //         data: {
          //           transport_id: localTransportId,
          //           ...remoteRest,
          //         },
          //         type: EVENT_FOR_SFU.CONNECT_PIPETRANSPORT,
          //       })
          //     );
          //   }
          //   const promiseData = await Promise.all(promiseList);
          //   for (let _ of promiseData) {
          //     console.log(_);
          //   }

          //   responseData = {
          //     room_id: room.id,
          //   };
          //   response({
          //     type: EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM,
          //     data: responseData,
          //   });
          // } else {
          //   responseData = {
          //     room_id: room.id,
          //   };
          //   response({
          //     type: EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM,
          //     data: responseData,
          //   });
          // }
          responseData = {
            room_id: room.id,
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


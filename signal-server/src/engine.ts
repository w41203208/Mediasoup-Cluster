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
    this.redisControllers = await createRedisController(
      await ControllerLoader.bootstrap()
    );
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
          this.sfuServerConnection!
        );
        this.roomList.set(room.id, room);
      }

      // 選擇適合的SFUServer建立Websocket連線，從local取得 或是 創建新的連線

      const ip_port = await this.sfuServerConnection!.getMinimumSFUServer();
      console.log(ip_port);
      console.log('User [%s] choose [%s] sfuserver.', peer.id, ip_port);

      const serverSocket = this.sfuServerConnection!.getServerSocket(ip_port);

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
      const _ = await PlayerController.setPlayer(peer.id);

      // 改變 room 狀態 init -> public
      if (rRoom.host.id === peer.id) {
        rRoom.state = 'public';
      } else {
        // 判斷與 LiveHoster 的關係
        // if()
      }

      // update room data in redis
      await RoomController.updateRoom(rRoom);

      const routerList = room.getRouters();

      serverSocket!
        .sendData({
          data: {
            mediaCodecs: config.MediasoupSetting.router.mediaCodecs,
            routers: routerList,
          },
          type: EVENT_FOR_SFU.CREATE_ROUTER,
        })
        .then((data) => {
          const { router_id } = data;
          console.log('User [%s] get router [%s]', peer.id, router_id);

          room.addRouter(router_id);
          peer.routerId = router_id;

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
}

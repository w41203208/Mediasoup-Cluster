import { EVENT_FOR_CLIENT_NOTIFICATION, EVENT_FROM_CLIENT_REQUEST, EVENT_PUBLISH } from '../EVENT';
import { getLocalIp } from '../util/tool';
import { v4 } from 'uuid';
import { RoomCreator } from '../core/RoomCreator';
import { CryptoCore } from '../util/CryptoCore';

import { Log } from '../util/Log';
import { RoomManager } from '../core/RoomManager';
import { ControllerFactory } from '../redis/ControllerFactory';
import { RoomController } from '../redis/controller';
import { ClientConnectionManager } from '../core/ClientConnectionManager';
import { SFUService } from './sfuService';
import { SFUAllocator } from '../core/SFUAllocator';
import { Player } from '../core/Player';
import { RoomRouter } from '../core/RoomRouter';

interface PeerRequestMessage {
  id: string;
  type: string;
  data: any;
}

interface HandleMessage {
  id: string;
  type: string;
  data: any;
}

interface SubMessage {
  identifyIp: string;
  type: string;
  data: Record<string, any>;
}

enum PubHandlerType {
  GETPRODUCER_COMPLETE = 'getProducerComplete',
}

export class RoomService {
  private _ip: string = getLocalIp();

  private _cryptoCore: CryptoCore;

  private RoomController: RoomController;

  private _roomCreater: RoomCreator;

  private _roomManager: RoomManager;

  private _roomRouter: RoomRouter;

  private _sfuService: SFUService;

  private _sfuAllocator: SFUAllocator;

  private _clientConnectionMgr: ClientConnectionManager;

  private log: Log = Log.GetInstance();
  constructor(
    cf: ControllerFactory,
    cc: CryptoCore,
    rc: RoomCreator,
    rr: RoomRouter,
    rm: RoomManager,
    ccm: ClientConnectionManager,
    sa: SFUAllocator,
    ss: SFUService
  ) {
    this._cryptoCore = cc;

    this._sfuAllocator = sa;

    this._sfuService = ss;

    this._roomCreater = rc;

    this._roomManager = rm;

    this._roomRouter = rr;

    this._roomRouter.on('handleOnRoom', (message: any) => {
      this.handlePubMessage(message);
    });

    this._roomManager.OnCloseRoom(this.closeRoomCallbackFunc.bind(this));

    this._clientConnectionMgr = ccm;

    this.RoomController = cf.getController('Room') as RoomController;
  }

  handlePubMessage(msg: SubMessage) {
    const { type, data, identifyIp } = msg;
    switch (type) {
      case EVENT_PUBLISH.CREATE_PIPETRANSPORT_CONSUME:
        this.handlePubCreatePipeTransportConsumer(data);
        break;
      case EVENT_PUBLISH.CREATE_CONSUME:
        this.handlePubCreateConsumer(data);
        break;
      case EVENT_PUBLISH.EVENT_EXECUTE_COMPLETE:
        if (identifyIp === this._ip) {
          // this.executeCompletePubHandler(data);
        }
        break;
    }
  }

  async handlePubCreateConsumer(data: any) {
    const peerOfServerMap = await this._roomManager.createPlayerConsumer_Pub(data.pubRoomId, data.pubPlayerId);
    Object.entries(peerOfServerMap).forEach(([key, value]: [key: string, value: any]) => {
      value.foreach((player: Player) => {
        this._sfuService
          .createConsume({
            serverId: key,
            roomId: data.pubRoomId,
            data: {
              routerId: player.routerId,
              transportId: player.recvTransport.id,
              rtpCapabilities: player.rtpCapabilities,
              producers: value.producerList,
            },
          })
          .then(({ data }) => {
            const { new_consumerList } = data;
            this.log.debug(`return new_consumerList: ${new_consumerList.toString()}`);
            const peer = this._clientConnectionMgr.getPeer(player.id)!;
            peer?.notify({
              type: EVENT_FOR_CLIENT_NOTIFICATION.NEW_CONSUMER,
              data: {
                consumerList: new_consumerList,
              },
            });
          });
      });
    });
  }

  async handlePubCreatePipeTransportConsumer(data: any) {}

  handleMessage(message: PeerRequestMessage, peerId: string) {
    const handleMsg: HandleMessage = {
      ...message,
    };
    console.log(handleMsg);
    switch (message.type) {
      case EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM:
        this.handleCreateRoom(handleMsg, peerId);
        break;
      case EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM:
        this.handleJoinRoom(handleMsg, peerId);
        break;
      case EVENT_FROM_CLIENT_REQUEST.LEAVE_ROOM:
        this.handleLeaveRoom(handleMsg, peerId);
        break;
      case EVENT_FROM_CLIENT_REQUEST.CLOSE_ROOM:
        this.handleCloseRoom(handleMsg, peerId);
        break;
      case EVENT_FROM_CLIENT_REQUEST.GET_ROUTER_RTPCAPABILITIES:
        this.handleGetRouterRtpCapabilities(handleMsg, peerId);
        break;
      case EVENT_FROM_CLIENT_REQUEST.CREATE_WEBRTCTRANSPORT:
        this.handleCreateWebRTCTransport(handleMsg, peerId);
        break;
      case EVENT_FROM_CLIENT_REQUEST.CONNECT_WEBRTCTRANPORT:
        this.handleConnectWebRTCTransport(handleMsg, peerId);
        break;
      case EVENT_FROM_CLIENT_REQUEST.PRODUCE:
        this.handleProduce(handleMsg, peerId);
        break;
    }
  }

  // 之後放到 RoomService
  async handleCreateRoom(msg: HandleMessage, peerId: string) {
    try {
      if (!msg.data.peer_id) {
        throw new Error('no input peer_id parameters');
      }
      if (!msg.data.room_name) {
        throw new Error('no input room_name parameters');
      }
      const dePeerId = this._cryptoCore.decipherIv(msg.data.peer_id);

      this.log.info('User [%s] create room [%s].', dePeerId, msg.data.room_name);

      const room_id = msg.data.room_name + '-' + Date.now();
      const rc = await this._roomCreater.createRoom(dePeerId, room_id, msg.data.room_name);

      if (rc) {
        throw new Error('room has already exists');
      }

      const peer = this._clientConnectionMgr.getPeer(peerId)!;
      peer.response({
        id: msg.id,
        type: msg.type,
        data: {
          msg: 'Successfully create!',
          room_id: room_id,
          state: true,
        },
      });
    } catch (e: any) {
      this.log.error(`${e.message}`);

      const peer = this._clientConnectionMgr.getPeer(peerId)!;
      peer.response({
        id: msg.id,
        type: msg.type,
        data: {
          msg: e.message,
        },
      });
    }
  }

  /**
   *
   * @param msg //need data { room_id, mediaCodec, peer_id}
   * @param peer
   */
  async handleJoinRoom(msg: HandleMessage, peerId: string) {
    try {
      if (!msg.data.room_id) {
        throw new Error('no input room_id parameters');
      }
      // const roomId = msg.data.room_id;
      // this.log.info('User [%s] join room [%s].', peer.id, roomId);

      // 選擇適合的SFUServer建立Websocket連線，從local取得 或是 創建新的連線
      const ip_port = await this._sfuAllocator.getMinimumSFUServer();

      if (ip_port === undefined) {
        throw new Error('Server is full');
      }
      await this._roomManager.getOrCreateRoom(msg.data.room_id);
      await this.RoomController.setRoomServerList(msg.data.room_id, ip_port);

      const data = await this._sfuService.createRouter({
        serverId: ip_port,
        roomId: msg.data.room_id,
        data: {},
      });
      const { router_id } = data;

      this.log.info('User [%s] get router [%s]', peerId, router_id);

      await this._roomManager.joinRoom({
        roomId: msg.data.room_id,
        playerId: peerId,
        playerServerId: ip_port,
        playerRouterId: router_id,
      });

      const serverList = await this.RoomController.getRoomServerList(msg.data.room_id);

      const localServerSocketId = ip_port;
      const remoteServerSocketIdList = serverList.filter((serverId: string) => serverId !== localServerSocketId);

      // maybe will happen something wrong about async
      if (remoteServerSocketIdList.length !== 0) {
        remoteServerSocketIdList.forEach((serverId: string) => {
          this._sfuService.connectTwoSFUServer({
            serverId: localServerSocketId,
            roomId: msg.data.room_id,
            data: {
              remoteServerId: serverId,
            },
          });
        });
      }

      this.log.debug('Join Room Response!!!!!');

      const peer = this._clientConnectionMgr.getPeer(peerId)!;
      peer.response({
        id: msg.id,
        type: msg.type,
        data: {
          room_id: msg.data.room_id,
        },
      });
    } catch (e: any) {
      const peer = this._clientConnectionMgr.getPeer(peerId)!;
      peer.response({
        id: msg.id,
        type: msg.type,
        data: {
          msg: e.message,
        },
      });
    }
  }

  async handleCloseRoom(msg: HandleMessage, peerId: string) {
    const peer = this._clientConnectionMgr.getPeer(peerId)!;
    try {
      this._roomManager.closeRoom(msg.data.room_id);

      peer.response({
        id: msg.id,
        type: msg.type,
        data: {},
      });
    } catch (e: any) {
      this.log.error(`${e.message}`);
    }
  }

  // 還沒做
  // 1. 假如 player 少到 0 的時候把 room 刪掉
  // 2. 當離開的是主持人時要做的事
  // 預計 2 也是跟 close 差不多作法
  async handleLeaveRoom(msg: HandleMessage, peerId: string) {
    const peer = this._clientConnectionMgr.getPeer(peerId)!;
    try {
      this._roomManager.leaveRoom(msg.data.room_id, peerId);

      peer.response({
        id: msg.id,
        type: msg.type,
        data: {},
      });
    } catch (e: any) {
      this.log.error(`${e.message}`);
    }
  }

  async handleGetRouterRtpCapabilities(msg: HandleMessage, peerId: string) {
    const peer = this._clientConnectionMgr.getPeer(peerId)!;
    try {
      if (!msg.data.room_id) {
        throw new Error('no input room_id');
      }
      const player = this._roomManager.getRoomPlayer(msg.data.room_id, peerId);

      if (!player) {
        throw new Error('no this player in room');
      }

      const data = await this._sfuService.getRouterRtpCapabilities({
        serverId: player.serverId,
        roomId: msg.data.room_id,
        data: {
          routerId: player.routerId,
        },
      });

      this.log.info('Player [%s] get routerRtpCapabilities!', peerId);

      peer.response({
        id: msg.id,
        type: EVENT_FROM_CLIENT_REQUEST.GET_ROUTER_RTPCAPABILITIES,
        data: { codecs: data.mediaCodecs },
      });
    } catch (e: any) {
      this.log.error(`${e.message}`);
    }
  }

  async handleCreateWebRTCTransport(msg: HandleMessage, peerId: string) {
    const peer = this._clientConnectionMgr.getPeer(peerId)!;
    try {
      if (!msg.data.room_id) {
        throw new Error('no input room_id');
      }
      const player = this._roomManager.getRoomPlayer(msg.data.room_id, peerId);

      if (!player) {
        throw new Error('no this player in room');
      }

      const data = await this._sfuService.createWebRTCTransport({
        serverId: player.serverId,
        roomId: msg.data.room_id,
        data: {
          routerId: player.routerId,
          consuming: msg.data.consuming,
          producing: msg.data.producing,
        },
      });
      this.log.info('Player [%s] createWebRTCTransport [%s] type is [%s]', peerId, data.transport_id, data.transportType);

      peer.response({
        id: msg.id,
        type: EVENT_FROM_CLIENT_REQUEST.GET_ROUTER_RTPCAPABILITIES,
        data: data,
      });
    } catch (e: any) {
      this.log.error(`${e.message}`);
    }
  }

  async handleConnectWebRTCTransport(msg: HandleMessage, peerId: string) {
    const peer = this._clientConnectionMgr.getPeer(peerId)!;
    try {
      if (!msg.data.room_id) {
        throw new Error('no input room_id');
      }
      const player = this._roomManager.getRoomPlayer(msg.data.room_id, peerId);

      if (!player) {
        throw new Error('no this player in room');
      }

      const data = await this._sfuService.connectWebRTCTransport({
        serverId: player.serverId,
        roomId: msg.data.room_id,
        data: {
          routerId: player.routerId,
          transportId: msg.data.transport_id,
          dtlsParameters: msg.data.dtlsParameters,
        },
      });
      peer.response({
        id: msg.id,
        type: EVENT_FROM_CLIENT_REQUEST.CONNECT_WEBRTCTRANPORT,
        data: {
          msg: data,
        },
      });
    } catch (e: any) {
      this.log.error(`${e.message}`);
    }
  }

  async handleProduce(msg: HandleMessage, peerId: string) {
    const peer = this._clientConnectionMgr.getPeer(peerId)!;
    try {
      if (!msg.data.room_id) {
        throw new Error('no input room_id');
      }
      const player = this._roomManager.getRoomPlayer(msg.data.room_id, peerId);

      if (!player) {
        throw new Error('no this player in room');
      }

      const data = await this._sfuService.createProduce({
        serverId: player.serverId,
        roomId: msg.data.room_id,
        data: {
          routerId: player.routerId,
          transportId: player.sendTransport.id,
          rtpParameters: msg.data.rtpParameters,
          rtpCapabilities: player.rtpCapabilities,
          kind: msg.data.kind,
        },
      });
      const { producer_id, consumerMap } = data;
      player.addProducer(producer_id);
      this.log.info('User [%s] use webrtcTransport [%s] produce [%s].', player.id, player.sendTransport.id, producer_id);

      // 這裡是不是可以不一定要等
      await this._sfuService.createPipeTransportProduce({
        serverId: player.serverId,
        roomId: msg.data.room_id,
        data: {
          consumerMap: consumerMap,
        },
      });

      player.produce();

      peer.response({
        id: msg.id,
        type: EVENT_FROM_CLIENT_REQUEST.PRODUCE,
        data: {
          producer_id: producer_id,
        },
      });
    } catch (e: any) {
      this.log.error(`${e.message}`);
    }
  }

  handleGetProduce(msg: HandleMessage, peerId: string) {
    const peer = this._clientConnectionMgr.getPeer(peerId)!;
    try {
      this._roomManager.getProduce(msg.data.room_id, peerId, msg.data.rtpCapabilities);

      peer.response({
        id: msg.id,
        type: EVENT_FROM_CLIENT_REQUEST.GET_PRODUCERS,
        data: {},
      });
    } catch (e: any) {}
  }

  handleDisconnected() {}

  async closeRoomCallbackFunc(player: Player, roomId: string) {
    const peer = this._clientConnectionMgr.getPeer(player.id);

    await this._sfuService.closeWebRTCTransport({
      serverId: player.serverId,
      roomId: roomId,
      data: { sendTransport: player.sendTransport, recvTransport: player.recvTransport },
    });

    // peer?.notify({
    //   type: 'roomClose',
    //   data: 'Room was closed by RoomOwner',
    // });
    await this._sfuAllocator.misallocateSFUServer(player.serverId);
    this._clientConnectionMgr.delPeer(player.id);
    peer?.died();
  }
}

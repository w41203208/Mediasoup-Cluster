import { EVENT_FOR_SFU, EVENT_FROM_CLIENT_REQUEST } from '../EVENT';
import { v4 } from 'uuid';
import { RoomCreator } from '../core/RoomCreator';
import { CryptoCore } from '../util/CryptoCore';

import { Log } from '../util/Log';
import { SFUConnectionManager } from '../core/SFUConnectionManager';
import { RoomManager } from '../core/RoomManager';
import { Peer } from '../core/Peer';
import { config } from '../../config';
import { ControllerFactory } from '../redis/ControllerFactory';
import { RoomController } from '../redis/controller';

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

export class RoomService {
  private _cryptoCore: CryptoCore;

  private _roomCreater: RoomCreator;

  private _sfuConnectionMgr: SFUConnectionManager;

  private _roomManager: RoomManager;

  private RoomController: RoomController;

  private log: Log = Log.GetInstance();
  constructor(
    cryptoCore: CryptoCore,
    roomCreator: RoomCreator,
    sfuConnectionMgr: SFUConnectionManager,
    roomManager: RoomManager,
    cf: ControllerFactory
  ) {
    this._cryptoCore = cryptoCore;

    this._sfuConnectionMgr = sfuConnectionMgr;

    this._roomCreater = roomCreator;

    this._roomManager = roomManager;

    this.RoomController = cf.getController('Room') as RoomController;
  }

  handleMessage(message: PeerRequestMessage, peer: Peer) {
    const handleMsg: HandleMessage = {
      ...message,
    };
    switch (message.type) {
      case EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM:
        this.handleCreateRoom(handleMsg, peer);
        break;
      case EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM:
        this.handleJoinRoom(handleMsg, peer);
        break;
    }
  }

  // 之後放到 RoomService
  async handleCreateRoom(msg: HandleMessage, peer: Peer) {
    try {
      if (!msg.data.peer_id) {
        throw new Error('no input peer_id parameters');
      }
      if (!msg.data.room_name) {
        throw new Error('no input room_name parameters');
      }
      const dePeerId = this._cryptoCore.decipherIv(msg.data.peer_id);

      this.log.info('User [%s] create room [%s].', dePeerId, msg.data.room_name);
      const room_id = msg.data.room_name + '-' + Date.now() + '-' + v4();
      const rc = await this._roomCreater.createRoom(dePeerId, room_id, msg.data.room_name);

      if (!rc) {
        throw new Error('room has already exists');
      }

      peer.response({
        id: msg.id,
        type: EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM,
        data: {
          msg: 'Successfully create!',
          room_id: room_id,
          state: true,
        },
      });
    } catch (e: any) {
      this.log.error(`${e.message}`);
      peer.response({
        id: msg.id,
        type: EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM,
        data: {
          msg: e.message,
        },
      });
    }
  }

  async handleJoinRoom(msg: HandleMessage, peer: Peer) {
    try {
      if (!msg.data.room_id) {
        throw new Error('no input room_id parameters');
      }
      // const roomId = msg.data.room_id;
      // this.log.info('User [%s] join room [%s].', peer.id, roomId);

      // 選擇適合的SFUServer建立Websocket連線，從local取得 或是 創建新的連線
      const ip_port = await this._sfuConnectionMgr.getMinimumSFUServer();
      console.log(ip_port);
      if (ip_port === undefined) {
        throw new Error('Server is full');
      }

      await this._roomManager.getOrCreateRoom(msg.data.room_id);

      await this._roomManager.updateRoomServerList(msg.data.room_id, ip_port);

      const serverSocket = await this._sfuConnectionMgr.connectToSFUServer(ip_port, msg.data.room_id);

      serverSocket
        .request({
          data: {
            room_id: msg.data.room_id,
            mediaCodecs: config.MediasoupSetting.router.mediaCodecs,
          },
          type: EVENT_FOR_SFU.CREATE_ROUTER,
        })
        .then(async ({ data }) => {
          const { router_id } = data;
          this.log.info('User [%s] get router [%s]', peer.id, router_id);

          await this._roomManager.joinRoom({
            roomId: msg.data.room_id,
            playerId: peer.id,
            playerServerId: ip_port,
            playerRouterId: router_id,
          });

          const serverList = await this.RoomController.getRoomServerList(msg.data.room_id);

          const localServerSocketId = ip_port;
          const remoteServerSocketIdList = serverList.filter((serverId: string) => {
            if (serverId !== localServerSocketId) {
              return serverId;
            }
          });

          if (remoteServerSocketIdList.length !== 0) {
            const localServerSocket = await this._sfuConnectionMgr.connectToSFUServer(localServerSocketId, msg.data.room_id);
            remoteServerSocketIdList.forEach(async (serverId: string) => {
              const remoteServerSocket = await this._sfuConnectionMgr.connectToSFUServer(serverId, msg.data.room_id);
              const [remoteConnectionData, localConnectionData] = await Promise.all([
                remoteServerSocket.request({
                  data: {
                    server_id: localServerSocketId,
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
                      server_id: localServerSocketId,
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
                      server_id: serverId,
                      ...remoteRest,
                    },
                    type: EVENT_FOR_SFU.CONNECT_PIPETRANSPORT,
                  })
                );
              }
              const promiseData = await Promise.all(promiseList);
              this.log.debug('Join Room Finanlly!!!!!');
            });
          }
          this.log.debug('Join Room Response!!!!!');
          peer.response({
            id: msg.id,
            type: EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM,
            data: {
              room_id: msg.data.room_id,
            },
          });
        });
    } catch (e: any) {
      peer.response({
        id: msg.id,
        type: EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM,
        data: {
          msg: e.message,
        },
      });
    }
  }

  async handleDisconnected() {}
}

import { ControllerFactory } from '../redis/ControllerFactory';
import { RoomController } from '../redis/controller';

import { Room } from './RoomT';

import { Player } from './Player';

import { Log } from '../util/Log';
import { RoomRouter } from './RoomRouter';
import { getLocalIp } from '../util/tool';
import { EVENT_PUBLISH } from '../EVENT';

import { PubHandlerMapData, DataJoinRoom, PubHandlerType } from './type.RoomManager';
import { v4 } from 'uuid';

export class RoomManager {
  private RoomController: RoomController;
  private _roomRouter: RoomRouter;

  private _roomMap: Map<string, Room>;

  private _pubHandlerMap: Map<string, PubHandlerMapData>;

  private log: Log = Log.GetInstance();

  private onCloseRoom: Function = (player: Player, roomId: string) => {};
  // private onGetRouterRtpCapabilities: Function = (player: Player, roomId: string) => {};

  constructor(cf: ControllerFactory, rr: RoomRouter) {
    this.RoomController = cf.getController('Room') as RoomController;
    this._roomRouter = rr;
    this._roomMap = new Map();
    this._pubHandlerMap = new Map();
  }

  // setOnBroadcast(func: Function) {
  //   this.onRoomBroadcast = func;
  // }
  OnCloseRoom(func: Function) {
    this.onCloseRoom = func;
  }

  // no use
  // OnGetRouterRtpCapabilities(func: Function) {
  //   this.onGetRouterRtpCapabilities = func;
  // }

  // 與 Room 有關
  async getOrCreateRoom(roomId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const rRoom = await this.RoomController.getRoom(roomId);

      if (!rRoom) {
        throw new Error('room is not exist!');
      }

      if (!this._roomMap.has(roomId)) {
        const newRoom = new Room({
          roomId: rRoom.id,
          roomName: rRoom.name,
          roomOwner: rRoom.owner,
        });

        newRoom.OnClose(() => {
          this.log.debug('Room [%s] is closing', newRoom.id);
          this.RoomController.delRoom(newRoom.id);
          this._roomMap.delete(newRoom.id);
        });

        newRoom.OnPublishTrack((playerId: string) => {
          this.log.debug('Has PlayerId to pass [%s]', playerId);
          this._roomRouter.publish('SignalChannel', {
            identifyIp: getLocalIp(),
            type: EVENT_PUBLISH.CREATE_CONSUME,
            data: {
              pubPlayerId: playerId,
              pubRoomId: newRoom.id,
            },
          });
        });

        this._roomMap.set(roomId, newRoom);
      }

      resolve();
    });
  }

  async closeRoom(roomId: string) {
    const room = this._roomMap.get(roomId)!;

    this.log.info('Room [%s] is closed.', roomId);

    room.close();
  }

  // deleteRoom(id: string) {
  //   this._roomMap.delete(id);
  // }

  // 與 player 有關
  leaveRoom(roomId: string, playerId: string) {
    this.log.info('User [%s] leave room [%s].', playerId, roomId);
    const room = this._roomMap.get(roomId)!;

    room.removePlayer(playerId);
  }

  async joinRoom({ roomId, playerId, playerServerId, playerRouterId }: DataJoinRoom) {
    const room = this._roomMap.get(roomId)!;

    const player = new Player(playerId, '', playerServerId, playerRouterId);

    player.OnClose(async () => {
      await this.RoomController.delRoomPlayerList(room.id, player.id);
      this.onCloseRoom(player, room.id);
    });

    // no use
    // player.OnGetRouterRtpCapabilities(() => {
    //   this.onGetRouterRtpCapabilities(player, room.id);
    // });

    room.join(player);

    this.RoomController.setRoomPlayerList(roomId, player.id);
  }

  // temp
  getRoomPlayer(roomId: string, peerId: string) {
    const room = this._roomMap.get(roomId)!;

    const player = room.getPlayer(peerId);

    return player;
  }

  // `tag` maybe like livekit room.onTrackPublished method, can to 參考
  async createPlayerConsumer_Pub(roomId: string, peerId: string) {
    const room = this._roomMap.get(roomId)!;
    const producerList = await this.RoomController.getRoomProducerList(roomId);

    // 將 [peer, peer, peer] => { serverId : [peer, peer, peer] }
    const localPlayerList = room.getJoinedPlayerList({ excludePlayer: peerId });
    let playerOfServerMap = {} as any;
    localPlayerList.forEach((player) => {
      if (!playerOfServerMap[player.serverId!]) {
        playerOfServerMap[player.serverId!] = [];
      }
      playerOfServerMap[player.serverId!].push({ player: player, producerList: producerList });
    });

    return playerOfServerMap;
  }

  async getProduce(roomId: string, peerId: string, rtpCapabilities: any) {
    const room = this._roomMap.get(roomId)!;
    const player = room.getPlayer(peerId);

    player.rtpCapabilities = rtpCapabilities;

    // 取得訂閱頻道的人數，作為要回傳任務完成的依據
    const currentOtherSignalCount = await this.RoomController.getRoomSubscriberNum('SignalChannel');
    const mapId = v4();
    this._pubHandlerMap.set(mapId, {
      count: currentOtherSignalCount,
      type: PubHandlerType.GETPRODUCER_COMPLETE,
      data: {
        handlerPlayerId: player.id,
        handlerRoomId: room.id,
      },
    });

    this._roomRouter.publish('SignalChannel', {
      identifyIp: getLocalIp(),
      type: EVENT_PUBLISH.CREATE_PIPETRANSPORT_CONSUME,
      data: {
        pubPlayerId: player.id,
        pubRoomId: room.id,
        ignoreServerId: player.serverId,
        pubHandlerMapId: mapId,
      },
    });
  }

  async createPlayerPipeTransportConsumer_Pub(roomId: string, peerId: string) {}
}

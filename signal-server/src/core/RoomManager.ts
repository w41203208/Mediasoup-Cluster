import { ControllerFactory } from '../redis/ControllerFactory';
import { RoomController } from '../redis/controller';

import { Room } from './RoomT';

import { Player } from './Player';

import { config } from '../../config';

export class RoomManager {
  private RoomController: RoomController;

  private _roomMap: Map<string, Room>;

  constructor(cf: ControllerFactory) {
    this.RoomController = cf.getController('Room') as RoomController;
    this._roomMap = new Map();
  }

  async joinRoom({
    roomId,
    playerId,
    playerServerId,
    playerRouterId,
  }: {
    roomId: string;
    playerId: string;
    playerServerId: string;
    playerRouterId: string;
  }) {
    const room = this._roomMap.get(roomId)!;

    const player = new Player(playerId, '', playerServerId, playerRouterId);

    room.addPlayer(player);

    this.RoomController.setRoomPlayerList(roomId, player.id);
  }

  async getOrCreateRoom(roomId: string) {
    const rRoom = await this.RoomController.getRoom(roomId);

    if (!rRoom) {
      throw new Error('room is not exist!');
    }

    if (this._roomMap.has(roomId)) {
      return this._roomMap.get(roomId)!;
    }

    const room = new Room({
      roomId: rRoom.id,
      roomName: rRoom.name,
      roomOwner: rRoom.host.id,
    });

    this._roomMap.set(roomId, room);
  }

  async updateRoomServerList(roomId: string, serverId: string) {
    const room = this._roomMap.get(roomId)!;

    room.addSFUServer(serverId);

    await this.RoomController.setRoomServerList(room.id, serverId);
  }

  async leaveRoom(roomId: string, playerId: string) {
    const room = this._roomMap.get(roomId)!;

    room.removePlayer(playerId);
  }

  deleteRoom(id: string) {
    this._roomMap.delete(id);
  }
}

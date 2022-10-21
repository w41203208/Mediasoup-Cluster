import { EVENT_FROM_CLIENT_REQUEST } from '../EVENT';
import { v4 } from 'uuid';
import { RoomCreator } from '../core/RoomCreator';
import { CryptoCore } from '../util/CryptoCore';

import { Log } from '../util/Log';
import { SFUConnectionManager } from '../core/SFUConnectionManager';
import { RoomManager } from '../core/RoomManager';

export class RoomService {
  private _cryptoCore: CryptoCore;

  private _roomCreater: RoomCreator;

  private _sfuConnectionMgr: SFUConnectionManager;

  private _roomManager: RoomManager;

  private log: Log = Log.GetInstance();
  constructor(cryptoCore: CryptoCore, roomCreator: RoomCreator, sfuConnectionMgr: SFUConnectionManager, roomManager: RoomManager) {
    this._cryptoCore = cryptoCore;

    this._sfuConnectionMgr = sfuConnectionMgr;

    this._roomManager = roomManager;

    this._roomCreater = roomCreator;
  }

  handleMessage(message: { type: string; data: any }, response: Function) {
    const { type, data } = message;
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
    try {
      if (!data.peer_id) {
        throw new Error('no input peer_id parameters');
      } else if (!data.room_name) {
        throw new Error('no input room_name parameters');
      }
      const dePeerId = this._cryptoCore.decipherIv(data.peer_id);

      this.log.info('User [%s] create room [%s].', dePeerId, data.room_name);
      const room_id = data.room_name + '-' + Date.now() + '-' + v4();
      const cr = await this._roomCreater.createRoom(dePeerId, room_id, data.room_name);

      let responseData;

      if (cr) {
        responseData = {
          msg: 'Successfully create!',
          room_id: room_id,
          state: true,
        };
      } else {
        throw new Error('room has already exists');
      }

      response({
        type: EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM,
        data: responseData,
      });
    } catch (e: any) {
      response({
        type: EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM,
        data: {
          msg: e.message,
        },
      });
    }
  }

  async handleJoinRoom(data: any, response: Function) {}
}

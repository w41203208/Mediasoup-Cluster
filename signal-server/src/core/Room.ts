import { TimeBomb } from '../util/TimeBomb';
import { Log } from '../util/Log';
import { Player } from './Player';

import { RoomConstructor } from './type.room';

export class Room {
  private _id: string;
  private _name: string;
  private _owner: string;
  private _routers: Map<string, any>;
  private _players: Map<string, Player>;
  private _bomb?: TimeBomb;

  private log: Log = Log.GetInstance();

  private onClose: Function = () => {};
  private onPublishTrack: Function = () => {};
  constructor({ roomId, roomName, roomOwner }: RoomConstructor) {
    this._id = roomId;
    this._name = roomName;
    this._owner = roomOwner;
    this._routers = new Map();
    this._players = new Map();
    // this._bomb = new TimeBomb(1000 * 60 * 5, () => {
    //   this.kickAllPeer();
    //   this.died();
    // });
  }

  OnClose(func: Function) {
    this.onClose = func;
  }

  OnPublishTrack(func: Function) {
    this.onPublishTrack = func;
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  getPlayer(id: string) {
    return this._players.get(id)!;
  }

  getJoinedPlayerList({ excludePlayer = {} as Player }: { excludePlayer: Player | string }): Array<Player> {
    let producerList: Array<Player> = [];
    if (typeof excludePlayer === 'object') {
      this._players.forEach((player: any) => {
        if (player.id !== excludePlayer.id) {
          producerList.push(player);
        }
      });
    } else if (typeof excludePlayer === 'string') {
      this._players.forEach((player: any) => {
        if (player.id !== excludePlayer) {
          producerList.push(player);
        }
      });
    }
    return producerList;
  }

  removePlayer(id: string) {
    const p = this._players.get(id)!;

    p.close();
    p.OnClose(() => {});
    this._players.delete(id);
  }

  // addRouter(id: string) {
  //   this._routers.set(id, {
  //     id: id,
  //   });
  // }

  /************* Router *************/
  // getRouters(): Array<string> {
  //   let routerList: Array<string> = [];
  //   this._routers.forEach((router: any) => {
  //     routerList.push(router.id);
  //   });
  //   return routerList;
  // }

  join(player: Player) {
    player.OnPublishProduce((producerId: string) => {
      this.onPublishTrack(player.id, producerId);
    });
    this._players.set(player.id, player);
  }

  close() {
    const playerList = this.getJoinedPlayerList({ excludePlayer: {} as Player });
    playerList.forEach(async (player: Player) => {
      player.close();
    });
    const onclose = this.onClose;
    if (onclose !== null) {
      this.onClose();
    }
  }
}

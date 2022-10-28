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

  /************* Peer *************/
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

  // addPeer(peer: Peer) {
  //   this._peers.set(peer.id, peer);
  //   const bomb = new TimeBomb(10 * 1000, () => {
  //     this.leaveRoom(peer);
  //   });
  //   peer.setTimeBomb(bomb);
  //   peer.on('handleOnRoomRequest', (peer: Peer, type: string, data: any, response: Function) => {
  //     this._handlePeerRequest({ peer, type, data, response });
  //   });
  //   peer.on('handleOnRoomNotification', (peer: Peer, type: string, data: any, notify: Function) => {
  //     this._handleOnNotification(peer, type, data, notify);
  //   });
  // }

  removePlayer(id: string) {
    const p = this._players.get(id)!;

    p.close();
    p.OnClose(() => {});
    this._players.delete(id);
  }

  // getOtherPeerProducers(id: string) {
  //   let producerList: Array<Record<string, string>> = [];
  //   this._players.forEach((player: Player) => {
  //     if (player.id !== id) {
  //       player.producers.forEach((producer: any) => {
  //         producerList.push({
  //           producer_id: producer.id,
  //         });
  //       });
  //     }
  //   });
  //   return producerList;
  // }

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
    player.OnPublishProduce(() => {
      this.onPublishTrack(player.id);
    });
    this._players.set(player.id, player);
  }

  // cleanUpPlayer() {
  //   this._players.clear();
  // }

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

import { SFUServer } from './SFUServer';
import { TimeBomb } from '../util/TimeBomb';
import { Log } from '../util/Log';
import { Player } from './Player';

import { RoomConstructor } from './type.room';

export class Room {
  private _id: string;
  private _name: string;
  private _owner: string;
  private _sfuServers: Map<string, SFUServer>;
  private _routers: Map<string, any>;
  private _players: Map<string, Player>;
  private _bomb?: TimeBomb;

  private log: Log = Log.GetInstance();
  constructor({ roomId, roomName, roomOwner }: RoomConstructor) {
    this._id = roomId;
    this._name = roomName;
    this._owner = roomOwner;
    this._sfuServers = new Map();
    this._routers = new Map();
    this._players = new Map();
    // this._bomb = new TimeBomb(1000 * 60 * 5, () => {
    //   this.kickAllPeer();
    //   this.died();
    // });
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  /************* Peer *************/
  getPeer(id: string) {
    return this._players.get(id);
  }

  getAllPlayers() {
    return this._players;
  }

  getJoinedPlayers({ excludePeer = {} as Player }: { excludePeer: Player | string }): Array<Player> {
    let producerList: Array<Player> = [];
    if (typeof excludePeer === 'object') {
      this._players.forEach((peer: any) => {
        if (peer.id !== excludePeer.id) {
          producerList.push(peer);
        }
      });
    } else if (typeof excludePeer === 'string') {
      this._players.forEach((peer: any) => {
        if (peer.id !== excludePeer) {
          producerList.push(peer);
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
    return this._players.delete(id);
  }

  getOtherPeerProducers(id: string) {
    let producerList: Array<Record<string, string>> = [];
    this._players.forEach((player: Player) => {
      if (player.id !== id) {
        player.producers.forEach((producer: any) => {
          producerList.push({
            producer_id: producer.id,
          });
        });
      }
    });
    return producerList;
  }

  addRouter(id: string) {
    this._routers.set(id, {
      id: id,
    });
  }

  /************* Router *************/
  // getRouters(): Array<string> {
  //   let routerList: Array<string> = [];
  //   this._routers.forEach((router: any) => {
  //     routerList.push(router.id);
  //   });
  //   return routerList;
  // }

  /************* SFUServer *************/
  getSFUServer(id: string) {
    return this._sfuServers.get(id);
  }

  addSFUServer(id: string) {
    const sfuServer = new SFUServer(id);
    this._sfuServers.set(sfuServer.id, sfuServer);
  }
  addPlayer(player: Player) {
    this._players.set(player.id, player);
  }
}

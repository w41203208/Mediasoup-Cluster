import { SFUServer } from './SFUServer';
import { Peer } from './Peer';
import { SFUConnectionManager } from 'src/core/SFUConnectionManager';
import { ServerEngine } from 'src/engine';
import { EVENT_FOR_CLIENT_NOTIFICATION, EVENT_FOR_SFU, EVENT_FROM_CLIENT_REQUEST, EVENT_FROM_SFU } from '../EVENT';
import { RedisClient } from '../redis/redis';
import { Subscriber } from '../redis/subscriber';
import { Publisher } from '../redis/publisher';
import { PlayerController, RoomController, SFUServerController } from '../redis/controller';

/* TEMP */
import { TimeBomb } from '../util/TimeBomb';
import { ControllerFactory } from 'src/redis/ControllerFactory';

interface PeerRequestHandler {
  peer: Peer;
  type: string;
  data: Record<string, any> | any;
  response: Function;
}

interface Handler {
  peer: Peer;
  data: Record<string, any> | any;
  response: Function;
}

interface RoomConstructor {
  roomId: string;
  roomName: string;
  roomOwner: string;
  mediaCodecs: Record<string, any>;
  sfuConnectionManager: SFUConnectionManager;
  redisClient: RedisClient;
  controllerFactory: ControllerFactory;

  listener: ServerEngine;
}

export class Room {
  private _mediaCodecs: Record<string, any>;
  private _id: string;
  private _name: string;
  private _owner: string;
  private _sfuServers: Map<string, SFUServer>;
  private _routers: Map<string, any>;
  private _peers: Map<string, Peer>;
  private _sfuConnectionManager: SFUConnectionManager;
  private _subscriber: Subscriber;
  private _publisher: Publisher;
  private _bomb: TimeBomb;

  private listener: ServerEngine;

  private RoomController: RoomController;
  private PlayerController: PlayerController;
  private SFUServerController: SFUServerController;

  // private RoomHeartCheck: TimeBomb;

  constructor({ roomId, roomName, roomOwner, mediaCodecs, sfuConnectionManager, redisClient, controllerFactory, listener }: RoomConstructor) {
    this._mediaCodecs = mediaCodecs;
    this._id = roomId;
    this._name = roomName;
    this._owner = roomOwner;
    this._sfuServers = new Map();
    this._routers = new Map();
    this._peers = new Map();
    this._bomb = new TimeBomb(1000 * 60 * 5, () => {
      this.kickAllPeer();
      this.died();
    });

    this._sfuConnectionManager = sfuConnectionManager;
    this._subscriber = Subscriber.createSubscriber(redisClient.Client!);
    this._publisher = Publisher.createPublisher(redisClient.Client!);
    this.listener = listener;
    this.RoomController = controllerFactory.getControler('Room') as RoomController;
    this.PlayerController = controllerFactory.getControler('Player') as PlayerController;
    this.SFUServerController = controllerFactory.getControler('SFU') as SFUServerController;

    this._subscriber.subscribe(this._id);
    this._subscriber.on('handleOnRoom', (message: any) => {
      const { type, data } = message;
      this._handleSubscriberMessage(type, data);
    });
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  /************* Peer *************/
  getPeer(id: string) {
    return this._peers.get(id);
  }

  getJoinedPeers({ excludePeer = {} as Peer }): Array<Peer> {
    let producerList: Array<Peer> = [];
    this._peers.forEach((peer: any) => {
      if (peer.id !== excludePeer.id) {
        producerList.push(peer);
      }
    });
    return producerList;
  }

  addPeer(peer: Peer) {
    this._peers.set(peer.id, peer);
    // peer._heartCheck.reset().start(
    //   () => this.timeStart(peer),
    //   () => this.timeout(peer)
    // );
    const bomb = new TimeBomb(10 * 1000, () => {
      this.leaveRoom(peer);
    });
    peer.setTimeBomb(bomb);
    peer.on('handleOnRoomRequest', (peer: Peer, type: string, data: any, response: Function) => {
      this._handlePeerRequest({ peer, type, data, response });
    });
    peer.on('handleOnRoomNotification', (peer: Peer, type: string, data: any, notify: Function) => {
      this._handleOnNotification(peer, type, data, notify);
    });
  }

  removePeer(id: string) {
    return this._peers.delete(id);
  }

  getOtherPeerProducers(id: string) {
    let producerList: Array<Record<string, string>> = [];
    this._peers.forEach((peer: Peer) => {
      if (peer.id !== id) {
        peer.producers.forEach((producer: any) => {
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

  addSFUServer(sfuServer: SFUServer) {
    this._sfuServers.set(sfuServer.id, sfuServer);
  }
  private _handleSubscriberMessage(type: string, data: any) {}

  private _handlePeerRequest({ peer, type, data, response }: PeerRequestHandler) {
    let serverSocket = this._sfuConnectionManager.getServerSocket(`${peer.serverId!}:${this._id}`);

    switch (type) {
      case EVENT_FROM_CLIENT_REQUEST.CLOSE_ROOM:
        this.closeRoomHandler({ peer, data, response });
        break;
      case EVENT_FROM_CLIENT_REQUEST.LEAVE_ROOM:
        this.leaveRoomHandler({ peer, data, response });
        break;
      case EVENT_FROM_CLIENT_REQUEST.GET_ROUTER_RTPCAPABILITIES:
        if (!serverSocket) return;

        serverSocket
          .request({
            data: {
              router_id: peer.routerId,
            },
            type: EVENT_FOR_SFU.GET_ROUTER_RTPCAPABILITIES,
          })
          .then(({ data }) => {
            response({
              type: EVENT_FROM_CLIENT_REQUEST.GET_ROUTER_RTPCAPABILITIES,
              data: { codecs: data.mediaCodecs },
            });
          });
        break;
      case EVENT_FROM_CLIENT_REQUEST.CREATE_WEBRTCTRANSPORT:
        if (!serverSocket) return;

        serverSocket
          .request({
            data: {
              router_id: peer.routerId,
              consuming: data.consuming,
              producing: data.producing,
            },
            type: EVENT_FOR_SFU.CREATE_WEBRTCTRANSPORT,
          })
          .then(({ data }) => {
            console.log('User [%s] createWebRTCTransport [%s] type is [%s]', peer.id, data.transport_id, data.transportType);
            peer.addTransport(data.transport_id, data.transportType);
            response({
              type: EVENT_FROM_CLIENT_REQUEST.CREATE_WEBRTCTRANSPORT,
              data: data,
            });
          });
        break;
      case EVENT_FROM_CLIENT_REQUEST.CONNECT_WEBRTCTRANPORT:
        if (!serverSocket) return;

        serverSocket
          .request({
            type: EVENT_FOR_SFU.CONNECT_WEBRTCTRANPORT,
            data: {
              router_id: peer.routerId,
              transport_id: data.transport_id,
              dtlsParameters: data.dtlsParameters,
            },
          })
          .then(({ data }) => {
            response({
              type: EVENT_FROM_CLIENT_REQUEST.CONNECT_WEBRTCTRANPORT,
              data: data,
            });
          });
        break;
      case EVENT_FROM_CLIENT_REQUEST.PRODUCE:
        if (!serverSocket) return;

        serverSocket
          .request({
            type: EVENT_FOR_SFU.CREATE_PRODUCE,
            data: {
              router_id: peer.routerId,
              transport_id: peer.sendTransport.id,
              rtpParameters: data.rtpParameters,
              kind: data.kind,
            },
          })
          .then(async ({ data }) => {
            const { producer_id, consumerMap } = data;
            console.log('User [%s] use webrtcTransport [%s] produce [%s].', peer.id, peer.sendTransport.id, producer_id);
            // console.log(consumerMap);
            console.log(consumerMap);
            const promises = Object.entries(consumerMap).map(([key, value]: [key: string, value: any]): Promise<any> => {
              return new Promise(async (resolve, reject) => {
                const remoteServerSocket = this._sfuConnectionManager.getServerSocket(`${key}:${this._id}`);
                const { data } = await remoteServerSocket?.request({
                  type: EVENT_FOR_SFU.CREATE_PIPETRANSPORT_PRODUCE,
                  data: {
                    ...value,
                  },
                });
                resolve(data);
              });
            });
            const promiseData = await Promise.all(promises);

            peer.addProducer(producer_id);

            let producerList = [
              {
                producer_id: producer_id,
              },
            ];

            // const rRoom = await this.RoomController.getRoom(this._id);

            // if (!rRoom) {
            //   return;
            // }

            // 這裡原則上是要跟 redis 拿在 room 裡面全部的 peer，但除了自己本身
            const peers = this.getJoinedPeers({ excludePeer: peer });

            // 先從全部的 peer 中整理出 peer map
            let peerMap = {} as any;
            peers.forEach((peer: Peer) => {
              peerMap[peer.id] = {
                peer_id: peer.id,
                router_id: peer.routerId,
                transport_id: peer.recvTransport.id,
                rtpCapabilities: peer.rtpCapabilities,
                producers: producerList,
              };
            });

            // use redis channle to another signal server

            // 從全部 peer 中篩選自己的 peer，並整理成 { serverId : [peer, peer, peer]}
            const localPeerList = this.getJoinedPeers({ excludePeer: {} as Peer });
            let partofPeerMap = {} as any;
            localPeerList.forEach((peer) => {
              // if (peerMap[peer.id]) {
              //   partofPeerMap[peer.id] = peerMap[peer.id];
              // }
              if (peerMap[peer.id]) {
                if (!partofPeerMap[peer.serverId!]) {
                  partofPeerMap[peer.serverId!] = [];
                }
                partofPeerMap[peer.serverId!].push(peerMap[peer.id]);
              }
            });

            Object.entries(partofPeerMap).forEach(([key, value]: [key: string, value: any]) => {
              const serverSocket = this._sfuConnectionManager.getServerSocket(`${key}:${this._id}`)!;
              console.log(key);
              console.log(value);
              value.forEach((v: any) => {
                serverSocket
                  ?.request({
                    type: EVENT_FOR_SFU.CREATE_CONSUME,
                    data: {
                      router_id: v.router_id,
                      transport_id: v.transport_id,
                      rtpCapabilities: v.rtpCapabilities,
                      producers: v.producers,
                    },
                  })
                  .then(({ data }) => {
                    const { new_consumerList } = data;
                    console.log('return new_consumerList');
                    const peer = this._peers.get(v.peer_id)!;

                    peer.notify({
                      type: EVENT_FOR_CLIENT_NOTIFICATION.NEW_CONSUMER,
                      data: {
                        consumerList: new_consumerList,
                      },
                    });
                  });
              });
            });

            // room.broadcast(peers, {
            //   type: EVENT_SERVER_TO_CLIENT.NEW_CONSUMER,
            //   data: {
            //     producers: producerList,
            //   },
            // });

            response({
              type: EVENT_FROM_CLIENT_REQUEST.PRODUCE,
              data: {
                id: producer_id,
              },
            });
          });
        break;
      case EVENT_FROM_CLIENT_REQUEST.GET_PRODUCERS:
        if (!serverSocket) return;

        peer.rtpCapabilities = data.rtpCapabilities;

        const producerList = this.getOtherPeerProducers(peer.id);

        response({});

        serverSocket
          .request({
            type: EVENT_FOR_SFU.CREATE_CONSUME,
            data: {
              router_id: peer.routerId,
              transport_id: peer.recvTransport.id,
              rtpCapabilities: data.rtpCapabilities,
              producers: producerList,
            },
          })
          .then(({ data }) => {
            const { new_consumerList } = data;
            peer.notify({
              type: EVENT_FOR_CLIENT_NOTIFICATION.NEW_CONSUMER,
              data: {
                consumerList: new_consumerList,
              },
            });
          });
        break;
    }
  }
  async closeRoomHandler({ peer, data, response }: Handler) {
    console.log('User [%s] close room [%s].', peer.id, this._id);

    /* 取得 redis room 中的所有 peer */

    /* 透過 pub /sub 廣播出去 */

    /* 剔除房間內的人包含房主自己 */
    this.kickAllPeer();

    await this.RoomController.delRoom(this._id);
    this.listener.deleteRoom(this._id);

    response({});
  }

  async leaveRoomHandler({ peer, data, response }: Handler) {
    console.log('User [%s] leave room [%s].', peer.id, this._id);

    await this.leaveRoom(peer); // 這裡有沒有需要等呢?

    response({});
  }

  private async leaveRoom(peer: Peer) {
    const rRoom = await this.RoomController.getRoom(this._id);

    if (rRoom) {
      const newPlayerList = rRoom.playerList.filter((playerId: string) => playerId !== peer.id);
      rRoom.playerList = newPlayerList;
      await this.RoomController.updateRoom(rRoom);
      await this.PlayerController.delPlayer(peer.id);

      this.removePeer(peer.id);
      peer.died();

      if (this.getJoinedPeers({ excludePeer: {} as Peer }).length === 0) {
        this.listener.deleteRoom(this._id);
      }

      await this.SFUServerController.reduceSFUServerCount(peer.serverId!);
      if (this._owner === peer.id) {
        console.log('Delete room after 5 minutes');

        this.broadcast(this._peers, {
          type: 'roomState',
          data: 'The host is disconnected, if the host does not connect back, the room will be deleted after five minutes',
        });

        this.selfDestruct();

        // this.RoomHeartCheck.reset().start(
        //   () => {},
        //   () => {
        //     this.serverHandleCloseRoom();
        //     this.listener.deleteRoom(this._id);
        //   }
        // );
      }
    }
  }

  private _handleOnNotification(peer: Peer, type: string, data: any, notify: Function) {
    switch (type) {
      case 'heartbeatCheck':
        // if (data === 'pong') {
        //   peer.timeBomb.reset().start(
        //     () => this.timeStart(peer),
        //     () => this.timeout(peer)
        //   );
        //   this.RoomHeartCheck.reset();
        // }
        if (data === 'pong') {
          peer.resetPing();
          if (peer.ig === this._owner) {
            this._bomb.countDownReset();
          }
        }
    }
  }

  handleServerSocketRequest(type: string, data: any, response: Function) {
    switch (type) {
      case EVENT_FROM_SFU.CONNECT_PIPETRANSPORT:
        break;
    }
  }

  // async serverHandleLeaveRoom(peer: Peer) {
  //   console.log('User [%s] was disconnect room [%s].', peer.id, this._id);
  //   peer.socket.close();
  //   console.log('close');

  //   const rRoom = await this.RoomController.getRoom(this._id);
  //   if (rRoom) {
  //     const newPlayerList = rRoom.playerList.filter((playerId: string) => playerId !== peer.id);
  //     rRoom.playerList = newPlayerList;
  //     await this.RoomController.updateRoom(rRoom);
  //     await this.PlayerController.delPlayer(peer.id);

  //     this.removePeer(peer.id);
  //     if (rRoom.host.id === peer.id) {
  //       console.log('Delete room after 5 minutes');
  //       this.broadcast(this._peers, {
  //         type: 'roomState',
  //         data: 'The host is disconnected, if the host does not connect back, the room will be deleted after five minutes',
  //       });
  //       this.RoomHeartCheck.reset().start(
  //         () => {},
  //         () => {
  //           this.serverHandleCloseRoom();
  //           this.listener.deleteRoom(this._id);
  //         }
  //       );
  //     }
  //   }
  // }

  async kickAllPeer() {
    this.broadcast(this._peers, {
      type: 'roomClose',
      data: 'Room was closed by RoomOwner',
    });
    this._peers.forEach(async (peer) => {
      await this.PlayerController.delPlayer(peer.id);
      await this.SFUServerController.reduceSFUServerCount(peer.serverId!);
      this.removePeer(peer.id);
      peer.died();
    });
  }

  broadcast(peers: Map<string, Peer>, data: any) {
    peers.forEach((peer) => {
      peer.notify(data);
    });
  }

  private selfDestruct() {
    this._bomb.countDownStart();
  }

  died() {
    this.listener.deleteRoom(this._id);
  }

  // async serverHandleCloseRoom() {
  //   this._peers.forEach(async (peer) => {
  //     await this.PlayerController.delPlayer(peer.id);
  //     this.removePeer(peer.id);
  //     peer.socket.close();
  //   });
  // }

  // timeStart(peer: Peer) {
  //   const timeStart = peer.notify({
  //     type: 'heartbeatCheck',
  //     data: 'ping',
  //   });
  //   return timeStart;
  // }

  // timeout(peer: Peer) {
  //   const timeout = this.serverHandleLeaveRoom(peer);
  //   return timeout;
  // }

  // consume({ consumerPeer, producer }) {
  //   consumerPeer.createConsumer(producer);
  // }
}

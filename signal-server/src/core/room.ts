import { SFUServer } from './SFUServer';
import { Peer } from '../core/peer';
import { SFUConnectionManager } from 'src/core/SFUConnectionManager';
import { ServerEngine } from 'src/engine';
import { EVENT_FOR_CLIENT_NOTIFICATION, EVENT_FOR_SFU, EVENT_FROM_CLIENT_REQUEST, EVENT_FROM_SFU } from '../EVENT';
import { RedisClient } from '../redis/redis';
import { Subscriber } from '../redis/subscriber';
import { Publisher } from '../redis/publisher';

/* TEMP */
import { Timer } from './Timer';

export class Room {
  private _mediaCodecs: Record<string, any>;
  private _id: string;
  private _sfuServers: Map<string, SFUServer>;
  private _routers: Map<string, any>;
  private _peers: Map<string, Peer>;
  private _sfuConnectionManager: SFUConnectionManager;
  private _subscriber: Subscriber;
  private _publisher: Publisher;

  private listener: ServerEngine;
  private RoomHeartCheck: Timer;

  constructor(
    room_id: string,
    mediaCodecs: Record<string, any>,
    sfuConnectionManager: SFUConnectionManager,
    redisClient: RedisClient,
    listener: ServerEngine
  ) {
    this._mediaCodecs = mediaCodecs;
    this._id = room_id;
    this._sfuServers = new Map();
    this._routers = new Map();
    this._peers = new Map();

    this._sfuConnectionManager = sfuConnectionManager;
    this._subscriber = Subscriber.createSubscriber(redisClient.Client!);
    this._publisher = Publisher.createPublisher(redisClient.Client!);
    this.listener = listener;
    this.RoomHeartCheck = new Timer(1000 * 60 * 5);

    this._subscriber.subscribe(this._id);
    this._subscriber.on('handleOnRoom', (message: any) => {
      const { type, data } = message;
      this._handleSubscriberMessage(type, data);
    });
  }

  get id() {
    return this._id;
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
    const that = this;
    // peer._heartCheck.reset().start(
    //   () => this.timeStart(peer),
    //   () => this.timeout(peer)
    // );
    peer.on('handleOnRoomRequest', (peer: Peer, type: string, data: any, response: Function) => {
      this._handlePeerRequest(peer, type, data, response);
    });
    peer.on('handleOnNotification', (peer: Peer, type: string, data: any) => {
      this._handleOnNotification(peer, type, data);
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
  async _handleSubscriberMessage(type: string, data: any) {}

  async _handlePeerRequest(peer: Peer, type: string, data: any, response: Function) {
    let serverSocket = this._sfuConnectionManager.getServerSocket(`${peer.serverId!}:${this._id}`);

    switch (type) {
      // 清空房間內的資訊，包刮在房間內的server 人數
      case EVENT_FROM_CLIENT_REQUEST.CLOSE_ROOM:
        console.log('User [%s] close room [%s].', peer.id, this._id);

        /* 修改成獨立出去的兩個方法  */

        /* 刪了自己 */
        await this.listener.redisController!.PlayerController.delPlayer(peer.id);
        await this.listener.redisController!.SFUServerController.reduceSFUServerCount(peer.serverId);
        await this.listener.redisController!.RoomController.delRoom(this._id);
        this.listener.deleteRoom(this._id);

        /* 剔除其他人 */
        this.serverHandleCloseRoom();

        response({});
        break;
      case EVENT_FROM_CLIENT_REQUEST.LEAVE_ROOM:
        console.log('User [%s] leave room [%s].', peer.id, this._id);
        const rRoom = await this.listener.redisController!.RoomController.getRoom(this._id);

        if (rRoom) {
          const newPlayerList = rRoom.playerList.filter((playerId: string) => playerId !== peer.id);
          rRoom.playerList = newPlayerList;
          await this.listener.redisController!.RoomController.updateRoom(rRoom);
          await this.listener.redisController!.PlayerController.delPlayer(peer.id);

          this.removePeer(peer.id);

          if (this.getJoinedPeers({ excludePeer: {} as Peer }).length === 0) {
            this.listener.deleteRoom(this._id);
          }

          await this.listener.redisController!.SFUServerController.reduceSFUServerCount(peer.serverId);
        }

        response({});
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

                    peer.socket.notify({
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
            peer.socket.notify({
              type: EVENT_FOR_CLIENT_NOTIFICATION.NEW_CONSUMER,
              data: {
                consumerList: new_consumerList,
              },
            });
          });
        break;
    }
  }

  async _handleOnNotification(peer: Peer, type: string, data: any) {
    switch (type) {
      case 'heartbeatCheck':
        if (data === 'pong') {
          peer._heartCheck.reset().start(
            () => this.timeStart(peer),
            () => this.timeout(peer)
          );
          this.RoomHeartCheck.reset();
        }
    }
  }

  async handleServerSocketRequest(type: string, data: any, response: Function) {
    switch (type) {
      case EVENT_FROM_SFU.CONNECT_PIPETRANSPORT:
        break;
    }
  }

  async serverHandleLeaveRoom(peer: Peer) {
    console.log('User [%s] was disconnect room [%s].', peer.id, this._id);
    peer.socket.close();
    console.log('close');

    const rRoom = await this.listener.redisController!.RoomController.getRoom(this._id);
    if (rRoom) {
      const newPlayerList = rRoom.playerList.filter((playerId: string) => playerId !== peer.id);
      rRoom.playerList = newPlayerList;
      await this.listener.redisController!.RoomController.updateRoom(rRoom);
      await this.listener.redisController!.PlayerController.delPlayer(peer.id);

      this.removePeer(peer.id);
      if (rRoom.host.id === peer.id) {
        console.log('Delete room after 5 minutes');
        this.broadcast(this._peers, {
          type: 'roomState',
          data: 'The host is disconnected, if the host does not connect back, the room will be deleted after five minutes',
        });
        this.RoomHeartCheck.reset().start(
          () => {},
          () => {
            this.serverHandleCloseRoom();
            this.listener.deleteRoom(this._id);
          }
        );
      }
    }
  }

  async serverHandleCloseRoom() {
    this.broadcast(this._peers, {
      type: 'roomState',
      data: 'Room was closed by RoomOwner',
    });
    this._peers.forEach(async (peer) => {
      await this.listener.redisController!.PlayerController.delPlayer(peer.id);
      this.removePeer(peer.id);
      peer.socket.close();
    });
  }

  timeStart(peer: Peer) {
    const timeStart = peer.socket.notify({
      type: 'heartbeatCheck',
      data: 'ping',
    });
    return timeStart;
  }

  timeout(peer: Peer) {
    const timeout = this.serverHandleLeaveRoom(peer);
    return timeout;
  }

  broadcast(peers: Map<string, Peer>, data: any) {
    peers.forEach((peer) => {
      peer.socket.notify(data);
    });
  }

  // consume({ consumerPeer, producer }) {
  //   consumerPeer.createConsumer(producer);
  // }
}

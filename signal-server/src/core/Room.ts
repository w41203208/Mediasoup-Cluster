import { SFUServer } from './SFUServer';
import { Peer } from './Peer';
import { SFUConnectionManager } from '../core/SFUConnectionManager';
import { ServerEngine } from '../engine';
import { EVENT_FOR_CLIENT_NOTIFICATION, EVENT_FOR_SFU, EVENT_FROM_CLIENT_REQUEST, EVENT_FROM_SFU, EVENT_PUBLISH } from '../EVENT';
import { Subscriber } from '../redis/subscriber';
import { Publisher } from '../redis/publisher';
import { PlayerController, RoomController, SFUServerController } from '../redis/controller';
import { TimeBomb } from '../util/TimeBomb';
import { v4 } from 'uuid';
import { Log } from '../util/Log';
import { PeerRequestHandler, Handler, RoomConstructor, PubHandlerMapData } from './type.room';

enum PubHandlerType {
  GETPRODUCER_COMPLETE = 'getProducerComplete',
}

export class Room {
  private _mediaCodecs: Record<string, any>;
  private _roomIp: string;
  private _id: string;
  private _name: string;
  private _owner: string;
  private _sfuServers: Map<string, SFUServer>;
  private _routers: Map<string, any>;
  private _peers: Map<string, Peer>;
  private _sfuConnectionManager: SFUConnectionManager;
  private _subscriber?: Subscriber;
  private _publisher: Publisher;
  private _bomb?: TimeBomb;

  private listener: ServerEngine;

  private RoomController: RoomController;
  private PlayerController: PlayerController;
  private SFUServerController: SFUServerController;

  private pubHandlerMap: Map<string, PubHandlerMapData>;

  private log: Log = Log.GetInstance();
  constructor({
    roomOption,
    roomId,
    roomName,
    roomOwner,
    mediaCodecs,
    sfuConnectionManager,
    redisClient,
    controllerFactory,
    listener,
  }: RoomConstructor) {
    this._roomIp = roomOption.ip;
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

    this.pubHandlerMap = new Map();

    this._sfuConnectionManager = sfuConnectionManager;
    this._subscriber = new Subscriber(redisClient.Client!);
    this._publisher = new Publisher(redisClient.Client!);
    this.listener = listener;
    this.RoomController = controllerFactory.getController('Room') as RoomController;
    this.PlayerController = controllerFactory.getController('Player') as PlayerController;
    this.SFUServerController = controllerFactory.getController('SFU') as SFUServerController;

    this._subscriber.subscribe(this._id);
    this._subscriber.on('handleOnRoom', (message: any) => {
      this._handleSubscriberMessage(message);
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

  getAllPeers() {
    return this._peers;
  }

  getJoinedPeers({ excludePeer = {} as Peer }: { excludePeer: Peer | string }): Array<Peer> {
    let producerList: Array<Peer> = [];
    if (typeof excludePeer === 'object') {
      this._peers.forEach((peer: any) => {
        if (peer.id !== excludePeer.id) {
          producerList.push(peer);
        }
      });
    } else if (typeof excludePeer === 'string') {
      this._peers.forEach((peer: any) => {
        if (peer.id !== excludePeer) {
          producerList.push(peer);
        }
      });
    }
    return producerList;
  }

  addPeer(peer: Peer) {
    this._peers.set(peer.id, peer);
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
  handleServerSocketRequest(type: string, data: any, response: Function) {
    switch (type) {
      case EVENT_FROM_SFU.CONNECT_PIPETRANSPORT:
        break;
    }
  }

  private _handleOnNotification(peer: Peer, type: string, data: any, notify: Function) {
    switch (type) {
      case 'heartbeatCheck':
        if (data.msg === 'pong') {
          peer.resetPing();
          if (peer.id === this._owner) {
            this._bomb!.countDownReset();
          }
        }
    }
  }

  private _handleSubscriberMessage(message: any) {
    const { type, data, identifyRoomId } = message;
    switch (type) {
      case EVENT_PUBLISH.CREATE_PIPETRANSPORT_CONSUME:
        // if (identifyRoomId !== this._roomIp) {
        //   this.createPipeTransportConsumerPubHandler(data);
        // }
        this.createPipeTransportConsumerPubHandler(data);
        break;
      case EVENT_PUBLISH.CREATE_CONSUME:
        this.createConsumerPubHandler(data);
        break;
      case EVENT_PUBLISH.EVENT_EXECUTE_COMPLETE:
        if (identifyRoomId === this._roomIp) {
          this.executeCompletePubHandler(data);
        }
        break;
    }
  }

  private _handlePeerRequest({ peer, type, data, response }: PeerRequestHandler) {
    switch (type) {
      case EVENT_FROM_CLIENT_REQUEST.CLOSE_ROOM:
        this.closeRoomHandler({ peer, data, response });
        break;
      case EVENT_FROM_CLIENT_REQUEST.LEAVE_ROOM:
        this.leaveRoomHandler({ peer, data, response });
        break;
      case EVENT_FROM_CLIENT_REQUEST.GET_ROUTER_RTPCAPABILITIES:
        this.getRouterRtpCapabilitiesHandler({ peer, data, response });
        break;
      case EVENT_FROM_CLIENT_REQUEST.CREATE_WEBRTCTRANSPORT:
        this.createWebRtcTransportHandler({ peer, data, response });
        break;
      case EVENT_FROM_CLIENT_REQUEST.CONNECT_WEBRTCTRANPORT:
        this.connectWebRtcTransportHandler({ peer, data, response });
        break;
      case EVENT_FROM_CLIENT_REQUEST.PRODUCE:
        this.produceHandler({ peer, data, response });
        break;
      case EVENT_FROM_CLIENT_REQUEST.GET_PRODUCERS:
        this.getProduceHandler({ peer, data, response });
        break;
      case EVENT_FROM_CLIENT_REQUEST.SET_PREFERRED_LAYERS:
        this.setPreferredLayers({ peer, data, response });
        break;
    }
  }
  async closeRoomHandler({ peer, data, response }: Handler) {
    this.log.info('User [%s] close room [%s].', peer.id, this._id);

    response({});

    /* 取得 redis room 中的所有 peer */

    /* 透過 pub /sub 廣播出去 */

    /* 剔除房間內的人包含房主自己 */
    this.kickAllPeer();

    await this.died(); // 應該是可以不用等待
  }

  async kickAllPeer() {
    this.broadcast(this._peers, {
      type: 'roomClose',
      data: 'Room was closed by RoomOwner',
    });
    this._peers.forEach(async (peer) => {
      const serverSocket = this._sfuConnectionManager.getServerSocket(`${peer.serverId!}:${this._id}`);
      if (!serverSocket) return;

      await Promise.all([
        this.PlayerController.delPlayer(peer.id),
        this.SFUServerController.reduceSFUServerCount(peer.serverId!),
        serverSocket.request({
          data: {
            sendTransport_id: peer.sendTransport.id,
            recvTransport_id: peer.recvTransport.id,
          },
          type: EVENT_FOR_SFU.CLOSE_TRANSPORT,
        }),
      ]);
      this.removePeer(peer.id);
      peer.died();
    });
  }

  async leaveRoomHandler({ peer, data, response }: Handler) {
    const serverSocket = this._sfuConnectionManager.getServerSocket(`${peer.serverId!}:${this._id}`);
    if (!serverSocket) return;

    this.log.info('User [%s] leave room [%s].', peer.id, this._id);

    serverSocket.request({
      data: {
        sendTransport_id: peer.sendTransport.id,
        recvTransport_id: peer.recvTransport.id,
      },
      type: EVENT_FOR_SFU.CLOSE_TRANSPORT,
    });

    response({});

    // 以下這裡有沒有需要等呢?
    await this.leaveRoom(peer);
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
        this.log.info('Room [%s] will be deleted after 5 minutes.', this._id);

        this.broadcast(this._peers, {
          type: 'roomState',
          data: 'The host is disconnected, if the host does not connect back, the room will be deleted after five minutes',
        });

        this.selfDestruct();
      }
    }
  }

  getRouterRtpCapabilitiesHandler({ peer, data, response }: Handler) {
    const serverSocket = this._sfuConnectionManager.getServerSocket(`${peer.serverId!}:${this._id}`);

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
  }

  createWebRtcTransportHandler({ peer, data, response }: Handler) {
    const serverSocket = this._sfuConnectionManager.getServerSocket(`${peer.serverId!}:${this._id}`);
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
        this.log.info('User [%s] createWebRTCTransport [%s] type is [%s]', peer.id, data.transport_id, data.transportType);
        peer.addTransport(data.transport_id, data.transportType);
        response({
          type: EVENT_FROM_CLIENT_REQUEST.CREATE_WEBRTCTRANSPORT,
          data: data,
        });
      });
  }

  connectWebRtcTransportHandler({ peer, data, response }: Handler) {
    const serverSocket = this._sfuConnectionManager.getServerSocket(`${peer.serverId!}:${this._id}`);

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
          data: {
            msg: data,
          },
        });
      });
  }

  produceHandler({ peer, data, response }: Handler) {
    const serverSocket = this._sfuConnectionManager.getServerSocket(`${peer.serverId!}:${this._id}`);

    console.log(`data.rtpParameters ${data.rtpParameters}`);

    if (!serverSocket) return;
    serverSocket
      .request({
        type: EVENT_FOR_SFU.CREATE_PRODUCE,
        data: {
          router_id: peer.routerId,
          transport_id: peer.sendTransport.id,
          rtpParameters: data.rtpParameters,
          rtpCapabilities: peer.rtpCapabilities,
          kind: data.kind,
        },
      })
      .then(async ({ data }) => {
        /**
         *  consumerMap = {
         *      ip:port( 對方的 ) : {
         *        producer_id,
         *        kind,
         *        rtpParameters
         *      }
         *    }
         */

        const { producer_id, consumerMap } = data;
        // 添加進 redis room producerlist 裡面
        this.RoomController.setRoomProducer(this._id, producer_id); // 應該也不用等待

        peer.addProducer(producer_id);
        this.log.info('User [%s] use webrtcTransport [%s] produce [%s].', peer.id, peer.sendTransport.id, producer_id);

        // console.log(consumerMap);
        const promises = Object.entries(consumerMap).map(([key, value]: [key: string, value: any]): Promise<any> => {
          return new Promise<void>(async (resolve, reject) => {
            const remoteServerSocket = this._sfuConnectionManager.getServerSocket(`${key}:${this._id}`);
            await remoteServerSocket?.request({
              type: EVENT_FOR_SFU.CREATE_PIPETRANSPORT_PRODUCE,
              data: {
                server_id: peer.serverId!,
                consumerMap: value,
              },
            });
            resolve();
          });
        });
        await Promise.all(promises);

        // use redis channle to another signal server
        this._publisher.publish(this._id, {
          identifyRoomId: this._roomIp,
          type: EVENT_PUBLISH.CREATE_CONSUME,
          data: {
            pubPeerId: peer.id,
          },
        });

        response({
          type: EVENT_FROM_CLIENT_REQUEST.PRODUCE,
          data: {
            id: producer_id,
          },
        });
      });
  }

  setPreferredLayers({ peer, data, response }: Handler) {
    const serverSocket = this._sfuConnectionManager.getServerSocket(`${peer.serverId!}:${this._id}`);
    if (!serverSocket) return;
    const { consumer_id, spatialLayer } = data;

    response({});

    serverSocket.request({
      type: EVENT_FOR_SFU.SET_PREFERRED_LAYERS,
      data: {
        consumer_id: consumer_id,
        spatialLayer: spatialLayer,
      },
    });
  }
  async getProduceHandler({ peer, data, response }: Handler) {
    peer.rtpCapabilities = data.rtpCapabilities;

    // 取得訂閱頻道的人數，作為要回傳任務完成的依據
    
    const currentOtherSignalCount = await this.RoomController.getRoomSubscriberNum(this._id);
    this.log.debug('Get currentOtherSignalCount %d', currentOtherSignalCount);
    const mapId = v4();
    this.pubHandlerMap.set(mapId, {
      count: currentOtherSignalCount,
      type: PubHandlerType.GETPRODUCER_COMPLETE,
      data: {
        peer: peer,
      },
    });

    this._publisher.publish(this._id, {
      identifyRoomId: this._roomIp,
      type: EVENT_PUBLISH.CREATE_PIPETRANSPORT_CONSUME,
      data: {
        serverId: peer.serverId!,
        handlerMapId: mapId,
        returnSqlServerIp: this._roomIp,
      },
    });
    // // 取得訂閱頻道的人數，作為要回傳任務完成的依據
    // const num = await this.RoomController.getRoomSubscriberNum(this._id);
    // // 創建 main thread and sub thread 共用的 '人數計算' Buffer
    // const bufferNum = new SharedArrayBuffer(4);
    // const viewNum = new Uint32Array(bufferNum);
    // viewNum[0] = num;
    // // 創建 worker 去等待
    // const worker = new Worker('./src/worker/worker.ts');
    // worker.postMessage({ num: num, buffer: this.MutexBuffer, bufferNum: bufferNum });
    // worker.on('message', (msg: any) => {
    //   console.log(msg);
    // });

    /* 去 sfu server 創建所有的producer */

    /* 依照 ip:port 來區分需要直接連線或是跨 sfuserver*/

    // const producerList = this.getOtherPeerProducers(peer.id);

    response({});
  }

  /**
   * from redis publish
   * @param data
   */
  async createPipeTransportConsumerPubHandler(data: any) {
    const { serverId, handlerMapId, returnSqlServerIp } = data;
    /* take all redis room producer */
    // const rProducerList = await this.RoomController.getRoomProducer(this._id);

    let producerMap: Record<string, any> = {};
    this._peers.forEach((peer: Peer) => {
      if (peer.serverId !== serverId) {
        const sid = peer.serverId!;
        if (producerMap[sid] === undefined) {
          producerMap[sid] = {};
        }
        const rid = peer.routerId!;
        if (producerMap[sid][rid] === undefined) {
          producerMap[sid][rid] = [];
        }
        peer.producers.forEach((producer: any) => {
          producerMap[sid][rid].push({ producerId: producer.id, rtpCapabilities: peer.rtpCapabilities });
        });
      }
    });

    // 如果 producerMap is null，代表沒有需要連到其他不同台 sfu server 去建立連線資訊的動作
    if (Object.keys(producerMap).length === 0) {
      this._publisher.publish(this._id, {
        type: EVENT_PUBLISH.EVENT_EXECUTE_COMPLETE,
        identifyRoomId: returnSqlServerIp,
        data: {
          pubHandlerMapId: handlerMapId,
        },
      });
      return;
    }

    /**
     *  key = "ip:port"
     *  value = a map
     */
    Object.entries(producerMap).forEach(([key, value]: [key: string, value: any]) => {
      const kkey = key;
      const serverSocket = this._sfuConnectionManager.getServerSocket(`${key}:${this._id}`)!;
      serverSocket
        .request({
          type: EVENT_FOR_SFU.CREATE_PIPETRANSPORT_CONSUME,
          data: {
            server_id: serverId,
            producerMap: value,
          },
        })
        .then(async ({ data }) => {
          const { consumerMap } = data;
          // console.log(consumerMap);
          const promises = Object.entries(consumerMap).map(([key, value]: [key: string, value: any]): Promise<any> => {
            return new Promise<void>(async (resolve, reject) => {
              const remoteServerSocket = await this._sfuConnectionManager.connectToSFUServer(key, this._id);
              await remoteServerSocket?.request({
                type: EVENT_FOR_SFU.CREATE_PIPETRANSPORT_PRODUCE,
                data: {
                  server_id: kkey,
                  consumerMap: value,
                },
              });
              resolve();
            });
          });
          await Promise.all(promises);

          this._publisher.publish(this._id, {
            type: EVENT_PUBLISH.EVENT_EXECUTE_COMPLETE,
            identifyRoomId: returnSqlServerIp,
            data: {
              pubHandlerMapId: handlerMapId,
            },
          });
        });
    });
  }

  /**
   * from redis publish
   * @param data
   */
  executeCompletePubHandler(data: any) {
    const handler = this.pubHandlerMap.get(data.pubHandlerMapId)!;
    if (handler.count > 0) {
      handler.count--;
    }
    if (handler.count === 0) {
      this.pubHandlerMap.delete(data.pubHandlerMapId);
      switch (handler.type) {
        case PubHandlerType.GETPRODUCER_COMPLETE:
          this.getProducerComplete(handler.data);
          break;
        default:
          break;
      }
    }
  }

  async getProducerComplete(handlerData: Record<string, any>) {
    const serverSocket = this._sfuConnectionManager.getServerSocket(`${handlerData.peer.serverId!}:${this._id}`);
    if (!serverSocket) return;

    // 取得目前所有的 producers
    const producerList = await this.RoomController.getRoomProducer(this._id);
    console.log('get ProducerList: ', producerList);

    serverSocket
      .request({
        type: EVENT_FOR_SFU.CREATE_CONSUME,
        data: {
          router_id: handlerData.peer.routerId,
          transport_id: handlerData.peer.recvTransport.id,
          rtpCapabilities: handlerData.peer.rtpCapabilities,
          producers: producerList,
        },
      })
      .then(({ data }) => {
        const { new_consumerList } = data;
        handlerData.peer.notify({
          type: EVENT_FOR_CLIENT_NOTIFICATION.NEW_CONSUMER,
          data: {
            consumerList: new_consumerList,
          },
        });
      });
  }

  /**
   * from redis publish
   * @param data
   */
  async createConsumerPubHandler(data: any) {
    const producerList = await this.RoomController.getRoomProducer(this._id);

    // 將 [peer, peer, peer] => { serverId : [peer, peer, peer] }
    const localPeerList = this.getJoinedPeers({ excludePeer: data.pubPeerId });
    let peerOfServerMap = {} as any;
    localPeerList.forEach((peer) => {
      if (!peerOfServerMap[peer.serverId!]) {
        peerOfServerMap[peer.serverId!] = [];
      }
      peerOfServerMap[peer.serverId!].push(peer);
    });

    /**
     * { serverId : [peer, peer, peer] }
     */
    // key = "ip:port", value = a map
    Object.entries(peerOfServerMap).forEach(([key, value]: [key: string, value: any]) => {
      const serverSocket = this._sfuConnectionManager.getServerSocket(`${key}:${this._id}`)!;
      value.forEach((peer: Peer) => {
        serverSocket
          ?.request({
            type: EVENT_FOR_SFU.CREATE_CONSUME,
            data: {
              router_id: peer.routerId,
              transport_id: peer.recvTransport.id,
              rtpCapabilities: peer.rtpCapabilities,
              producers: producerList,
            },
          })
          .then(({ data }) => {
            const { new_consumerList } = data;
            console.log('return new_consumerList');

            peer.notify({
              type: EVENT_FOR_CLIENT_NOTIFICATION.NEW_CONSUMER,
              data: {
                consumerList: new_consumerList,
              },
            });
          });
      });
    });
  }

  private broadcast(peers: Map<string, Peer>, data: any) {
    peers.forEach((peer) => {
      peer.notify(data);
    });
  }

  private selfDestruct() {
    this._bomb!.countDownStart();
  }

  private async died() {
    await this.RoomController.delRoom(this._id);
    this.listener.deleteRoom(this._id);
    this._bomb = undefined;
    this._subscriber?.remove('handleOnRoom', (message: any) => {
      this._handleSubscriberMessage(message);
    });
    this._subscriber?.unSubscribe(this._id);
    this._subscriber = undefined;
  }

  // consume({ consumerPeer, producer }) {
  //   consumerPeer.createConsumer(producer);
  // }
}

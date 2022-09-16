const { v4 } = require('uuid');
const { createServer } = require('https');
const { WSServer } = require('./src/websocket');

const config = require('./config');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const Peer = require('./src/peer');
const Room = require('./src/room');
const ServerSocket = require('./src/SFUServerSocket');
const SFUServer = require('./src/SFUServer');
const { createRedisController, Controllers } = require('./src/redis/index');
require('dotenv').config();
// ssl option
const sslOption = {
  key: fs.readFileSync(path.join(__dirname, config.ServerSetting.sslKey), 'utf-8'),
  cert: fs.readFileSync(path.join(__dirname, config.ServerSetting.sslCert), 'utf-8'),
};

const EVENT_FROM_CLIENT_REQUEST = {
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  GET_PRODUCERS: 'getProducers',
  GET_ROUTER_RTPCAPABILITIES: 'getRouterRtpCapabilities',
  CREATE_WEBRTCTRANSPORT: 'createWebRTCTransport',
  CONNECT_WEBRTCTRANPORT: 'connectWebRTCTransport',
  PRODUCE: 'produce',
  CONSUME: 'consume',
  GET_ROOM_INFO: 'getRoomInfo',
  LEAVE_ROOM: 'leaveRoom',
  CLOSE_ROOM: 'closeRoom',
};

const EVENT_FOR_CLIENT_NOTIFICATION = {
  NEW_CONSUMER: 'newConsumer',
};

const EVENT_FOR_SFU = {
  CREATE_ROUTER: 'createRouter',
  GET_ROUTER_RTPCAPABILITIES: 'getRouterRtpCapabilities',
  CREATE_WEBRTCTRANSPORT: 'createWebRTCTransport',
  CONNECT_WEBRTCTRANPORT: 'connectWebRTCTransport',
  CREATE_PRODUCE: 'createProduce',
  CREATE_CONSUME: 'createConsume',
};

const roomList = new Map();
const serverSocketList = new Map();

(async function () {
  const { RoomController, SFUServerController, PlayerController } = await createRedisController(Controllers);

  const run = async () => {
    const app = runExpress();
    // https
    const server = runHttpsServer(app);

    //websocket to clinet
    runWebSocketServer(server);
  };

  const runExpress = () => {
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get('/new_sfu_server', (req, res) => {
      res.send('testtest');
    });
    app.get('/test', async (req, res) => {
      // const s = await getMinimumServer();
      // console.log(s);
      res.send('test');
    });
    return app;
  };

  const runHttpsServer = (app) => {
    const httpsServer = createServer(sslOption, app);
    const server = httpsServer.listen(config.ServerSetting.listenPort, '0.0.0.0', () => {
      console.log(`Server is listening at ${process.env.HOST}:${config.ServerSetting.listenPort}`);
    });
    return server;
  };
  const runWebSocketServer = (server) => {
    const wsServer = new WSServer(server);

    wsServer.on('connection', (ws) => {
      ws.id = (0, v4)();
      const peer = new Peer(ws.id, '', ws);
      // const hasPing = req.url?.includes('ping=true');
      // const heartCheck = {
      //   timeout: 10 * 1000,
      //   timeoutObj: null,
      //   serverTimeoutObj: null,
      //   reset() {
      //     if (this.timeoutObj) clearTimeout(this.timeoutObj);
      //     if (this.serverTimeoutObj) clearTimeout(this.serverTimeoutObj);
      //     return this;
      //   },
      //   start() {
      //     const self = this;
      //     this.timeoutObj = setTimeout(function () {
      //       ws.send("ping");
      //       self.serverTimeoutObj = setTimeout(function () {
      //         ws.close();
      //       }, self.timeout)
      //     }, this.timeout)
      //   }
      // }

      peer.on('request', (message, response) => {
        const { id, type, data } = message;
        switch (type) {
          case 'test':
            console.log(ws.id);
            break;
          case EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM:
            handleCreateRoom(id, data, peer, response);
            break;
          case EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM:
            handleJoinRoom(id, data, peer, response);
            break;
          case EVENT_FROM_CLIENT_REQUEST.CLOSE_ROOM:
            handleCloseRoom(id, data, peer, response);
            break;
          case EVENT_FROM_CLIENT_REQUEST.LEAVE_ROOM:
            handleLeaveRoom(id, data, peer, response);
            break;
          case EVENT_FROM_CLIENT_REQUEST.GET_ROUTER_RTPCAPABILITIES:
            handleGetRouterRtpCapabilities(id, data, peer, response);
            break;
          case EVENT_FROM_CLIENT_REQUEST.CREATE_WEBRTCTRANSPORT:
            handleCreateWebRTCTransport(id, data, peer, response);
            break;
          case EVENT_FROM_CLIENT_REQUEST.CONNECT_WEBRTCTRANPORT:
            handleConnectWebRTCTranport(id, data, peer, response);
            break;
          case EVENT_FROM_CLIENT_REQUEST.PRODUCE:
            handleProduce(id, data, peer, response);
            break;
          case EVENT_FROM_CLIENT_REQUEST.GET_PRODUCERS:
            handleGetProducers(id, data, peer, response);
            break;
        }
      });

      peer.on('notification', (message, notify) => {
        const { type, data } = message;
        console.log(type, data);
      });

    });
  };
  /********************/
  /*                  */
  /*                  */
  /*      Request     */
  /*                  */
  /*                  */
  /********************/
  const handleCreateRoom = async (id, data, peer, response) => {
    const { room_id } = data;
    console.log('User [%s] create room [%s].', peer.id, room_id);
    const rRoom = await RoomController.setRoom(room_id);

    let responseData;
    if (rRoom) {
      rRoom.host = {
        id: peer.id,
        producerIdList: [],
      };
      await RoomController.updateRoom(rRoom);
      responseData = {
        msg: 'Successfully create!',
        state: true,
      };
    } else {
      responseData = {
        msg: 'already exists!',
        state: false,
      };
    }

    response({
      id,
      type: EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM,
      data: responseData,
    });
  };

  const handleJoinRoom = async (id, data, peer, response) => {
    const { room_id } = data;
    console.log('User [%s] join room [%s].', peer.id, room_id);

    const rRoom = await RoomController.getRoom(room_id);

    let responseData;
    if (rRoom) {
      // 建立或取得 localRoom
      let room;
      if (roomList.has(room_id)) {
        room = roomList.get(room_id);
      } else {
        room = new Room(rRoom.id, config.MediasoupSetting.router.mediaCodecs);
        roomList.set(room.id, room);
      }

      // 選擇適合的SFUServer建立Websocket連線，從local取得 或是 創建新的連線
      let serverSocket;
      const ip_port = await getMinimumSFUServer();
      console.log(ip_port);
      if (serverSocketList.has(ip_port)) {
        serverSocket = serverSocketList.get(ip_port);
      } else {
        serverSocket = await connectToSFUServer(ip_port);
      }
      // new SFUServer，SFUServer 添加到 room
      const recordServer = new SFUServer(ip_port, serverSocket);
      room.addRecordServer(recordServer);
      // 添加 SFUServer port 給 peer
      peer.serverId = ip_port;
      // rRoom update data
      let c = false;
      rRoom.serverList.forEach((server) => {
        if (ip_port === server) {
          c = true;
        }
      });
      if (!c) {
        rRoom.serverList.push(ip_port);
      }

      // Peer 添加到 room
      room.addPeer(peer);
      rRoom.playerList.push(peer.id);
      const _ = await PlayerController.setPlayer(peer.id);

      // 改變 room 狀態 init -> public
      if (rRoom.host.id === peer.id) {
        rRoom.state = 'public';
      } else {
        // 判斷與 LiveHoster 的關係
        // if()
      }

      // update room data in redis
      await RoomController.updateRoom(rRoom);

      const routerList = room.getRouters();

      serverSocket
        .sendData({
          data: { mediaCodecs: config.MediasoupSetting.router.mediaCodecs, routers: routerList },
          type: EVENT_FOR_SFU.CREATE_ROUTER,
        })
        .then((data) => {
          const { router_id } = data;
          console.log('User [%s] get router [%s]', peer.id, router_id);

          room.addRouter(router_id);
          peer.routerId = router_id;

          responseData = {
            room_id: room.id,
          };
          response({
            id,
            type: EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM,
            data: responseData,
          });
        });
    } else {
      responseData = {
        msg: 'This room is not exist!',
      };
      response({
        id,
        type: EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM,
        data: responseData,
      });
    }
  };

  const handleCloseRoom = async (id, data, peer, response) => {
    const { room_id } = data;
    console.log('User [%s] close room [%s].', peer.id, room_id);

    roomList.delete(room_id);

    await PlayerController.delPlayer(peer.id);
    await RoomController.delRoom(room_id);
    console.log(roomList);
    response({ id });
  };

  const handleLeaveRoom = async (id, data, peer, response) => {
    const { room_id } = data;
    console.log('User [%s] leave room [%s].', peer.id, room_id);
    const rRoom = await RoomController.getRoom(room_id);

    if (rRoom) {
      let room;
      if (roomList.has(rRoom.id)) {
        room = roomList.get(room_id);
      }
      const newPlayerList = rRoom.playerList.filter((playerId) => playerId !== peer.id);
      rRoom.playerList = newPlayerList;
      await RoomController.updateRoom(rRoom);
      await PlayerController.delPlayer(peer.id);

      room.removePeer(peer.id);

      if (room.getJoinedPeers({ excludePeer: {} }).length === 0) {
        roomList.delete(room_id);
      }
    }

    response({ id });
  };

  const handleGetRouterRtpCapabilities = (id, data, peer, response) => {
    const { room_id } = data;

    if (!roomList.has(room_id)) {
      response({ id });
      return;
    }

    const room = roomList.get(room_id);

    const recordServer = room.getRecordServer(peer.serverId);

    recordServer.serverSocket
      .sendData({
        data: {
          router_id: peer.routerId,
        },
        type: EVENT_FOR_SFU.GET_ROUTER_RTPCAPABILITIES,
      })
      .then((data) => {
        const { mediaCodecs } = data;
        response({ id, type: EVENT_FROM_CLIENT_REQUEST.GET_ROUTER_RTPCAPABILITIES, data: { codecs: mediaCodecs } });
      });
  };

  const handleCreateWebRTCTransport = (id, data, peer, response) => {
    const { room_id, consuming, producing } = data;

    if (!roomList.has(room_id)) {
      response({ id });
    }
    const room = roomList.get(room_id);

    const recordServer = room.getRecordServer(peer.serverId);

    recordServer.serverSocket
      .sendData({
        data: {
          router_id: peer.routerId,
          consuming: consuming,
          producing: producing,
        },
        type: EVENT_FOR_SFU.CREATE_WEBRTCTRANSPORT,
      })
      .then((data) => {
        console.log('User [%s] createWebRTCTransport [%s] type is [%s]', peer.id, data.transport_id, data.transportType);
        peer.addTransport(data.transport_id, data.transportType);
        response({ id, type: EVENT_FROM_CLIENT_REQUEST.CREATE_WEBRTCTRANSPORT, data: data });
      });
  };

  const handleConnectWebRTCTranport = (id, data, peer, response) => {
    const { room_id, transport_id, dtlsParameters } = data;
    if (!roomList.has(room_id)) {
      response({ id });
    }
    const room = roomList.get(room_id);
    const recordServer = room.getRecordServer(peer.serverId);

    recordServer.serverSocket
      .sendData({
        type: EVENT_FOR_SFU.CONNECT_WEBRTCTRANPORT,
        data: {
          router_id: peer.routerId,
          transport_id: transport_id,
          dtlsParameters: dtlsParameters,
        },
      })
      .then((data) => {
        response({ id, type: EVENT_FROM_CLIENT_REQUEST.CONNECT_WEBRTCTRANPORT, data: data });
      });
  };

  const handleProduce = (id, data, peer, response) => {
    const { room_id, transport_id, kind, rtpParameters } = data;

    if (!roomList.has(room_id)) {
      response({ id });
    }
    const room = roomList.get(room_id);

    const recordServer = room.getRecordServer(peer.serverId);

    recordServer.serverSocket
      .sendData({
        type: EVENT_FOR_SFU.CREATE_PRODUCE,
        data: {
          router_id: peer.routerId,
          transport_id: peer.sendTransport.id,
          rtpParameters,
          kind,
        },
      })
      .then((data) => {
        const { producer_id } = data;
        console.log('User [%s] produce [%s].', peer.id, producer_id);
        peer.addProducer(producer_id);

        let producerList = [
          {
            producer_id: producer_id,
          },
        ];

        // 這裡原則上是要跟 redis 拿在 room 裡面全部的 peer，但除了自己本身
        const peers = room.getJoinedPeers({ excludePeer: peer });

        // 先從全部的 peer 中整理出 peer map
        let peerMap = {};
        peers.forEach((peer) => {
          peerMap[peer.id] = {
            router_id: peer.routerId,
            transport_id: peer.recvTransport.id,
            rtpCapabilities: peer.rtpCapabilities,
            producers: producerList,
          };
        });

        // use redis channle to another signal server

        // 從全部 peer 中篩選自己的 peer，並整理成 { serverId : [peer, peer, peer]}
        const localPeerList = room.getJoinedPeers({ excludePeer: {} });
        partofPeerMap = {};
        localPeerList.forEach((peer) => {
          // if (peerMap[peer.id]) {
          //   partofPeerMap[peer.id] = peerMap[peer.id];
          // }
          if (peerMap[peer.id]) {
            if (!partofPeerMap[peer.serverId]) {
              partofPeerMap[peer.serverId] = [];
            }
            partofPeerMap[peer.serverId].push(peerMap[peer.id]);
          }
        });
        console.log(partofPeerMap);

        Object.entries(partofPeerMap).forEach(([key, value]) => {
          const serverSocket = serverSocketList.get(key);
          console.log(value);
          // serverSocket.sendData({
          //   type: EVENT_FOR_SFU.CREATE_CONSUME,
          //   data: {
          //     router_id: peer.routerId,
          //     transport_id: peer.recvTransport.id,
          //     rtpCapabilities: rtpCapabilities,
          //     producers: producerList,
          //   },
          // });
        });

        // room.broadcast(peers, {
        //   type: EVENT_SERVER_TO_CLIENT.NEW_CONSUMER,
        //   data: {
        //     producers: producerList,
        //   },
        // });

        response({
          id,
          type: EVENT_FROM_CLIENT_REQUEST.PRODUCE,
          data: {
            id: producer_id,
          },
        });
      });
  };
  const handleGetProducers = (id, data, peer, response) => {
    const { room_id, rtpCapabilities } = data;
    const room = roomList.get(room_id);
    peer.rtpCapabilities = rtpCapabilities;

    const producerList = room.getOtherPeerProducers(peer.id);

    const recordServer = room.getRecordServer(peer.serverId);

    response({ id });

    recordServer.serverSocket
      .sendData({
        type: EVENT_FOR_SFU.CREATE_CONSUME,
        data: {
          router_id: peer.routerId,
          transport_id: peer.recvTransport.id,
          rtpCapabilities: rtpCapabilities,
          producers: producerList,
        },
      })
      .then((data) => {
        const { new_consumerList } = data;
        peer.notify({
          type: EVENT_FOR_CLIENT_NOTIFICATION.NEW_CONSUMER,
          data: {
            consumerList: new_consumerList,
          },
        });
      });
  };

  /********************/
  /*                  */
  /*                  */
  /*   Notification   */
  /*                  */
  /*                  */
  /********************/

  const getMinimumSFUServer = async () => {
    return new Promise((resolve, reject) => {
      SFUServerController.getAllSFUServer().then(async (data) => {
        try {
          let okServer = undefined;
          let i = 0;
          while (i < data.length || okServer === undefined) {
            const key = data[i];
            const count = await SFUServerController.getSFUServerCount(key);
            let new_count;
            if (count < 1 && okServer === undefined) {
              okServer = key;
              new_count = await SFUServerController.addSFUServerCount(key);
              if (new_count >= 2) {
                await SFUServerController.reduceSFUServerCount(key);
                okServer = undefined;
              }
            }
            i++;
          }
          resolve(okServer);
        } catch (error) {
          console.log(error);
          reject(error);
        }
      });
    });
  };

  const connectToSFUServer = async (ip_port) => {
    const [ip, port] = ip_port.split(':');
    const serverSocket = new ServerSocket(ip, port);
    await serverSocket.start();
    serverSocketList.set(serverSocket.id, serverSocket);
    return serverSocket;
  };

  run();
})();

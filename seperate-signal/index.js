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
const ServerSocket = require('./src/serversocket');
const RecordServer = require('./src/recordServer');
const RecordRouter = require('./src/recordRouter');

// 要讓 Node 環境允許未授權的憑證，不然就是要使用以下方法，讓 Node 不會拒絕未授權憑證。
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// ssl option
const sslOption = {
  key: fs.readFileSync(path.join(__dirname, config.ServerSetting.sslKey), 'utf-8'),
  cert: fs.readFileSync(path.join(__dirname, config.ServerSetting.sslCert), 'utf-8'),
};
const EVENT_FOR_CLIENT = {
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

const EVENT_FOR_SFU = {
  CREATE_ROUTER: 'createRouter',
};

const roomList = new Map();
const serverSocketList = new Map();
const ServerList = {
  '192.168.1.98:8581': {
    current_people: 89,
  },
  '192.168.1.98:8585': {
    current_people: 50,
  },
  '192.168.1.98:8787': {
    current_people: 100,
  },
  '192.168.1.98:8686': {
    current_people: 99,
  },
};

const run = async () => {
  const app = runExpress();
  // https
  const server = runHttpsServer(app);
  //websocket to clinet
  runWebSocketServer(server);
};

const runExpress = () => {
  const app = express();
  app.use(express.json());
  app.use(cors);
  return app;
};

const runHttpsServer = (app) => {
  const httpsServer = createServer(sslOption, app);
  const server = httpsServer.listen(config.ServerSetting.listenPort, '0.0.0.0', () => {
    console.log(`Server is listening at https://192.168.1.98:${config.ServerSetting.listenPort}`);
  });
  return server;
};

const runWebSocketServer = (server) => {
  const wsServer = new WSServer(server);

  wsServer.on('connection', (ws) => {
    ws.id = (0, v4)();
    const peer = new Peer(ws.id, '', ws);
    peer.on('handle', (message) => {
      const { type, data } = message;
      switch (type) {
        case 'test':
          console.log(ws.id);
          break;
        case EVENT_FOR_CLIENT.CREATE_ROOM:
          handleCreateRoom(data.room_id, ws, wsServer);
          break;
        case EVENT_FOR_CLIENT.JOIN_ROOM:
          handleJoinRoom(data.room_id, ws);
          break;
        case EVENT_FOR_CLIENT.CLOSE_ROOM:
          roomList.delete(data.room_id);
          console.log(roomList);
          break;
        case EVENT_FOR_CLIENT.LEAVE_ROOM:
          break;
      }
    });
  });
};

const handleCreateRoom = (room_id, ws, wsServer) => {
  let msg;
  if (roomList.has(room_id)) {
    msg = 'already exists!';
  } else {
    // 新增新的房間
    roomList.set(room_id, new Room(room_id, wsServer));

    msg = 'Successfully create!';
    ws.send(
      JSON.stringify({
        type: EVENT_FOR_CLIENT.CREATE_ROOM,
        data: {
          msg: msg,
        },
      })
    );
  }
};

const handleJoinRoom = (room_id, ws) => {
  let room;
  if (roomList.has(room_id)) {
    room = roomList.get(room_id);
  }

  // 選擇適合的 ServerSocket
  let serverSocket;
  const ip_port = getMinimumServer();
  if (serverSocketList.has(ip_port)) {
    serverSocket = serverSocketList.get(ip_port);
  }

  // new RecordServer 並加入 Room 中
  const recordServer = new RecordServer(ip_port, serverSocket);

  room.addRecordServer(recordServer);

  serverSocket
    .sendData({
      data: { mediaCodecs: config.MediasoupSetting.router.mediaCodecs },
      type: EVENT_FOR_SFU.CREATE_ROUTER,
    })
    .then((data) => {
      const { router_id } = data;
      recordServer.addReocrdRouter(new RecordRouter(router_id));
      ws.send(
        JSON.stringify({
          type: EVENT_FOR_CLIENT.JOIN_ROOM,
          data: {
            room_id: room.id,
          },
        })
      );
    });
};

const getMinimumServer = () => {
  let s;
  let min = 99;
  Object.entries(ServerList).forEach(([key, value]) => {
    if (value.current_people < 99 && min > value.current_people) {
      min = value.current_people;
      s = key;
    }
  });
  return s;
};

// 模擬監聽 redis 更新 sfu server status 要隨時變動 socketServer 數量
(function () {
  const ip = '192.168.1.98';
  const port = 8585;
  const serverSocket = new ServerSocket(ip, port);
  serverSocket.start();
  serverSocketList.set(serverSocket.id, serverSocket);
})();

run();

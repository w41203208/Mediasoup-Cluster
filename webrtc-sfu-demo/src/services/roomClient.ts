import * as mc from "mediasoup-client";
import {
  Consumer,
  Device,
  MediaKind,
  Producer,
  Transport,
} from "mediasoup-client/lib/types";
import { Socket } from "@/services/websocket";
import { logger } from "@/util/logger";

interface RoomClientOptions {
  clientUID: string;
  roomId: string;
  roomName: string;
  isProduce: boolean;
  isConsume: boolean;
}

const mediaType = {
  audio: "audio",
  video: "video",
  screen: "screen",
};

const EVENT_FOR_CLIENT = {
  CREATE_ROOM: "createRoom",

  GET_PRODUCERS: "getProducers",
  GET_ROUTER_RTPCAPABILITIES: "getRouterRtpCapabilities",
  CREATE_WEBRTCTRANSPORT: "createWebRTCTransport",
  CONNECT_WEBRTCTRANPORT: "connectWebRTCTransport",
  PRODUCE: "produce",
  CONSUME: "consume",
  SET_PREFERRED_LAYERS: "setPreferredLayers",
  GET_ROOM_INFO: "getRoomInfo",
  LEAVE_ROOM: "leaveRoom",
  CLOSE_ROOM: "closeRoom",
};

const EVENT_SERVER_TO_CLIENT = {
  NEW_CONSUMER: "newConsumer",
  JOIN_ROOM: "joinRoom",
};

const EVENT_FOR_TEST = {
  TEST1: "test1",
  TEST2: "test2",
};

function createSocketConnection(): Socket {
  const url = import.meta.env.VITE_WSSURL;
  const socket = new Socket({ url });
  return socket;
}

export class RoomClient {
  private _clientUID: string;
  private _clientRole: string;
  private _roomId: string;
  private _roomName: string;
  private _localMediaContainer: HTMLElement | null;
  private _remoteMediaContainer: HTMLElement | null;
  private _socket: Socket;

  private _isConsume: boolean;
  private _isProduce: boolean;
  // private _forceTCP: boolean;

  private _device?: Device;

  private _sendTransport: null | Transport;
  private _recvTransport: null | Transport;
  private _webcamProducers: Map<string, Producer>;
  private _micProducers: Map<string, Producer>;
  private _consumers: Map<string, Consumer>;

  constructor({
    clientUID,
    roomId,
    roomName,
    isProduce = true,
    isConsume = true,
  }: RoomClientOptions) {
    this._clientUID = clientUID;
    this._roomId = roomId;
    this._roomName = roomName;
    this._localMediaContainer = null;
    this._remoteMediaContainer = null;
    this._socket = createSocketConnection();
    this._initSocketNotification();
    this._socket.on("connecting", () => {
      console.log("the websocket is connecting");
    });
    this._socket.start(this._clientUID, this._roomId);
    this._isConsume = isConsume;
    this._isProduce = isProduce;
    // this._forceTCP = true;

    this._sendTransport = null;
    this._recvTransport = null;

    this._webcamProducers = new Map();
    this._micProducers = new Map();
    this._consumers = new Map();
  }

  set localMediaContainer(el: HTMLElement) {
    this._localMediaContainer = el;
  }

  set remoteMediaContainer(el: HTMLElement) {
    this._remoteMediaContainer = el;
  }

  get socket() {
    return this._socket;
  }

  get getRoomId() {
    return this._roomId;
  }

  private _initSocketNotification() {
    this._socket.on("notification", (message: any) => {
      const { type, data } = message;
      switch (type) {
        case EVENT_SERVER_TO_CLIENT.NEW_CONSUMER:
          for (let consumer of data.consumerList) {
            console.log(data);
            this.consume(consumer);
          }
          break;
        case EVENT_SERVER_TO_CLIENT.JOIN_ROOM:
          this._clientRole = data.userRole;
          this.init();
          break;
      }
    });
  }

  // host
  // createRoom(uid: string, roomName: string) {
  //   return this._socket
  //     .request({
  //       data: { peer_id: uid, room_name: roomName },
  //       type: EVENT_FOR_CLIENT.CREATE_ROOM,
  //     })
  //     .then(({ data }) => {
  //       logger({ text: 'Create Room', data: data.msg });
  //       if (data.state) {
  //         const res = this.joinRoom(uid, data.room_id).then((res) => {
  //           return res;
  //         });
  //         this._roomId = data.room_id;
  //         return res;
  //       }
  //     });
  // }
  closeRoom(roomId: string) {
    this._socket.request({
      data: { room_id: this._roomId },
      type: EVENT_FOR_CLIENT.CLOSE_ROOM,
    });
    this._socket.close();
    this._recvTransport?.close();
    this._sendTransport?.close();
  }
  leaveRoom(roomId: string) {
    this._socket.request({
      data: { room_id: this._roomId },
      type: EVENT_FOR_CLIENT.LEAVE_ROOM,
    });
    this._socket.close();
  }
  test1() {
    this._socket
      .request({ data: {}, type: EVENT_FOR_TEST.TEST1 })
      .then((data) => {
        console.log(data);
      });
  }
  test2() {
    this._socket
      .request({ data: {}, type: EVENT_FOR_TEST.TEST2 })
      .then((data) => {
        console.log(data);
      });
  }

  // audience
  async init() {
    console.log("the RTC is init");
    // get router RtpCapabilities
    const mediaCodecs = await this.getRouterRtpCapabilities(this._roomId);
    // load Device
    this._device = new mc.Device();
    await this._device.load({ routerRtpCapabilities: mediaCodecs });
    // init transport ( consumer and produce )

    if (this._isProduce) {
      this._sendTransport = await this.createSendTransport(this._device);
    }

    if (this._isConsume) {
      this._recvTransport = await this.createRecvTransport(this._device);
    }
    // console.log(this._device.rtpCapabilities);
    await this._socket.request({
      data: {
        room_id: this._roomId,
        rtpCapabilities: this._device.rtpCapabilities,
      },
      type: EVENT_FOR_CLIENT.GET_PRODUCERS,
    });
  }

  getRouterRtpCapabilities(roomId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this._socket
        .request({
          data: { room_id: this._roomId },
          type: EVENT_FOR_CLIENT.GET_ROUTER_RTPCAPABILITIES,
        })
        .then(({ data }) => {
          resolve(data.codecs);
        });
    });
  }

  async createSendTransport(device: Device) {
    const { data: transportInfo } = await this._socket.request({
      data: {
        room_id: this._roomId,
        producing: true,
        consuming: false,
      },
      type: EVENT_FOR_CLIENT.CREATE_WEBRTCTRANSPORT,
    });
    const { transport_id, iceParameters, iceCandidates, dtlsParameters } =
      transportInfo;
    const sendTransport = device.createSendTransport({
      id: transport_id,
      iceParameters,
      iceCandidates,
      dtlsParameters,
    });
    /* Register sendTransport listen event */
    sendTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          const { data } = await this._socket.request({
            data: {
              room_id: this._roomId,
              transport_id: sendTransport.id,
              dtlsParameters,
            },
            type: EVENT_FOR_CLIENT.CONNECT_WEBRTCTRANPORT,
          });
          console.log(data);
          callback();
        } catch (error) {
          errback(error as Error);
        }
      }
    );
    sendTransport.on(
      "produce",
      async ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
          console.log(rtpParameters);
          const { data } = await this._socket.request({
            data: {
              room_id: this._roomId,
              transport_id: sendTransport.id,
              kind,
              rtpParameters,
              appData,
            },
            type: EVENT_FOR_CLIENT.PRODUCE,
          });

          callback({ id: data.producer_id });
        } catch (error) {
          errback(error as Error);
        }
      }
    );

    return sendTransport;
  }

  async createRecvTransport(device: Device) {
    const { data: transportInfo } = await this._socket.request({
      data: {
        room_id: this._roomId,
        producing: false,
        consuming: true,
      },
      type: EVENT_FOR_CLIENT.CREATE_WEBRTCTRANSPORT,
    });
    const { transport_id, iceParameters, iceCandidates, dtlsParameters } =
      transportInfo;
    const recvTransport = device.createRecvTransport({
      id: transport_id,
      iceParameters,
      iceCandidates,
      dtlsParameters,
    });
    /* Register sendTransport listen event */
    recvTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          const { data } = await this._socket.request({
            data: {
              room_id: this._roomId,
              transport_id: recvTransport.id,
              dtlsParameters,
            },
            type: EVENT_FOR_CLIENT.CONNECT_WEBRTCTRANPORT,
          });
          console.log(data);

          callback();
        } catch (error) {
          errback(error as Error);
        }
      }
    );

    return recvTransport;
  }
  produce({
    type,
    deviceId = null,
  }: {
    type: string;
    deviceId: string | null;
  }) {
    if (this._isProduce) {
      switch (type) {
        case mediaType.video:
          /*抓取相機解析度*/
          const constraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          };
          this.enableWebCam({ deviceId, constraints: constraints });
          break;
        case mediaType.audio:
          this.enableMic({ deviceId });
          break;
      }
    }
  }

  toggleMediaSending({ type }: { type: string }): Promise<any> {
    return new Promise((resolve) => {
      switch (type) {
        case mediaType.video:
          this.toggleWebCam().then((res) => {
            resolve(res);
          });
          break;
        case mediaType.audio:
          this.toggleMic().then((res) => {
            resolve(res);
          });
          break;
      }
    });
  }

  async enableWebCam({
    deviceId = null,
    constraints = null,
  }: {
    deviceId: string | null;
    constraints: MediaTrackConstraints | null;
  }) {
    let stream;
    let track: MediaStreamTrack;
    let duplicate: boolean = false;
    //codec mediaKind
    const mediaKind: MediaKind = "video";
    if (!this._sendTransport) {
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia(
        deviceId
          ? { video: { deviceId: { exact: deviceId } } }
          : { video: true }
      );
      track = stream.getTracks()[0];
      if (constraints) {
        await track.applyConstraints(constraints);
      }

      //避免裝置重複取用
      this._webcamProducers.forEach((producer) => {
        if (
          track.getSettings().deviceId == producer.track?.getSettings().deviceId
        ) {
          duplicate = true;
        }
      });
      if (duplicate) {
        return;
      }

      const params = {
        track,
        encodings: [
          {
            rid: "r0",
            // maxBitrate: 300000,
            scaleResolutionDownBy: 4,
            scalabilityMode: "S1T3",
          },
          {
            rid: "r1",
            // maxBitrate: 1000000,
            scaleResolutionDownBy: 2,
            scalabilityMode: "S1T3",
          },
          {
            rid: "r2",
            // maxBitrate: 5000000,
            scaleResolutionDownBy: 1,
            scalabilityMode: "S1T3",
          },
        ],
        codecOptions: {
          videoGoogleStartBitrate: 1000,
        },
        //選擇codec
        codec: {
          kind: mediaKind,
          mimeType: "video/h264",
          clockRate: 90000,
          parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42e01f",
            "level-asymmetry-allowed": 1,
            "x-google-start-bitrate": 1000,
          },
        },
      };
      //可以添將一些屬性 codecOptions、encodings
      const producer = await this._sendTransport.produce(params);

      producer.on("@close", () => {});

      this._webcamProducers.set(producer.id, producer);

      /* 之後會區分開開啟與添加畫面的方法 */
      const elem = document.createElement("video");
      elem.srcObject = stream;
      elem.autoplay = true;
      elem.width = 1280;
      elem.height = 720;
      this._localMediaContainer?.appendChild(elem);
    } catch (error: any) {
      console.log(error);
    }
  }

  async enableMic({ deviceId = null }: { deviceId: string | null }) {
    let stream;
    let track: MediaStreamTrack;
    let duplicate: boolean = false;
    if (!this._sendTransport) {
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia(
        deviceId
          ? {
              audio: { deviceId: { exact: deviceId } },
            }
          : { audio: true }
      );
      track = stream.getTracks()[0];

      //避免裝置重複取用
      this._micProducers.forEach((producer) => {
        if (
          track.getSettings().deviceId == producer.track?.getSettings().deviceId
        ) {
          duplicate = true;
        }
      });
      if (duplicate) {
        return;
      }

      const params = {
        track,
        codecOptions: {
          opusStereo: true,
          opusDtx: true,
        },
      };
      // //可以添將一些屬性 codecOptions、encodings
      const producer = await this._sendTransport.produce(params);

      producer.on("@close", () => {});

      this._micProducers.set(producer.id, producer);
      // /* 之後會區分開開啟與添加畫面的方法 */
    } catch (error: any) {
      console.log(error);
    }
  }

  async toggleWebCam() {
    return new Promise((resolve) => {
      this._webcamProducers.forEach((producer) => {
        if (producer.paused) {
          producer.resume();
        } else if (!producer.paused) {
          producer.pause();
        }
        resolve(producer.paused);
      });
    });
  }
  async toggleMic() {
    return new Promise((resolve) => {
      this._micProducers.forEach((producer) => {
        if (producer.paused) {
          producer.resume();
        } else if (!producer.paused) {
          producer.pause();
        }
        resolve(producer.paused);
      });
    });
  }

  async consume(consumerParams: any) {
    console.log("consume");
    const { id, producer_id, kind, rtpParameters } = consumerParams;
    let repeatProducer: boolean = false;
    this._consumers.forEach((consumer) => {
      if (consumer.producerId == producer_id) {
        repeatProducer = true;
      }
    });

    if (!this._recvTransport || repeatProducer) {
      return;
    }
    const consumer = await this._recvTransport.consume({
      id,
      producerId: producer_id,
      kind,
      rtpParameters,
    });
    this._consumers.set(consumer.id, consumer);
    const stream = new MediaStream();
    stream.addTrack(consumer.track);
    let elem;
    if (kind === "video") {
      elem = document.createElement("video");
      elem.srcObject = stream;
      elem.id = consumer.id;
      elem.width = 1280;
      elem.height = 720;
      elem.autoplay = true;
      this._remoteMediaContainer?.appendChild(elem);
    } else {
      elem = document.createElement("audio");
      elem.srcObject = stream;
      elem.autoplay = true;
    }
  }

  async setPreferredLayers(spatialLayer: number) {
    let consumer_id = null;
    this._consumers.forEach((consumer) => {
      consumer_id = consumer.id;
    });
    await this._socket.request({
      data: {
        room_id: this._roomId,
        consumer_id: consumer_id,
        spatialLayer: spatialLayer,
      },
      type: EVENT_FOR_CLIENT.SET_PREFERRED_LAYERS,
    });
  }

  async testNet() {
    this._consumers.forEach((consumer) => {
      consumer.getStats().then((res) => {
        console.log(`起始RTC狀態`);
        res.forEach((element) => {
          console.log(element);
        });
      });
    });
    setTimeout(() => {
      this._consumers.forEach((consumer) => {
        consumer.getStats().then((res) => {
          console.log(`五分鐘後RTC狀態`);
          res.forEach((element) => {
            console.log(element);
          });
        });
      });
    }, 300000);
  }
}

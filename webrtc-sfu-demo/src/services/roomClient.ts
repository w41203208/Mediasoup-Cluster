import * as mc from 'mediasoup-client';
import { Device, Transport } from 'mediasoup-client/lib/types';
import { Socket } from '@/services/websocket';
import { logger } from '@/util/logger';

interface RoomClientOpeions {
  clientUID: string;
  roomId: string;
  clientRole: string;
  isProduce: boolean;
  isConsume: boolean;
}

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

const EVENT_SERVER_TO_CLIENT = {
  NEW_CONSUMER: 'newConsumer',
};

export class RoomClient {
  private _clientUID: string;
  private _clientRole: string;
  private _roomId: string;
  private _socket: Socket;

  private _isConsume: boolean;
  private _isProduce: boolean;
  // private _forceTCP: boolean;

  private _device?: Device;

  private _sendTransport: null | Transport;
  private _recvTransport: null | Transport;

  constructor({ clientUID, roomId, clientRole, isProduce = true, isConsume = true }: RoomClientOpeions) {
    this._clientUID = clientUID;
    this._clientRole = clientRole;
    this._roomId = roomId;
    this._socket = this._createSocketConnection();

    this._isConsume = isConsume;
    this._isProduce = isProduce;
    // this._forceTCP = true;

    this._sendTransport = null;
    this._recvTransport = null;

    this._initSocketNotification();
  }

  get socket() {
    return this._socket;
  }

  private _createSocketConnection(): Socket {
    const url = 'wss://localhost:9999';
    const socket = new Socket({ url });
    socket.start();
    return socket;
  }

  private _initSocketNotification() {
    this._socket.on('notification', (message: any) => {
      const { type, data } = message;
      console.log(data);
      switch (type) {
        case EVENT_SERVER_TO_CLIENT.NEW_CONSUMER:
          for (let { producer_id } of data.producers) {
            this.consume(producer_id);
          }
          break;
      }
    });
  }

  // host
  createRoom(roomId: string) {
    this._socket.request({ data: { room_id: roomId }, type: EVENT_FOR_CLIENT.CREATE_ROOM }).then(({ data }) => {
      logger({ text: 'Create Room', data: data.msg });
      this.joinRoom(roomId);
    });
  }
  closeRoom(roomId: string) {
    this._socket.request({ data: { room_id: roomId }, type: EVENT_FOR_CLIENT.CLOSE_ROOM });
    this._socket.close();
  }

  // audience
  async joinRoom(roomId: string) {
    const {
      data: { room_id },
    } = await this._socket.request({ data: { room_id: roomId }, type: EVENT_FOR_CLIENT.JOIN_ROOM });

    logger({ text: `User ${this._clientUID} join room ${room_id}`, data: room_id });
    // get router RtpCapabilities
    const mediaCodecs = await this.getRouterRtpCapabilities(this._roomId);
    // load Device
    this._device = new mc.Device();
    await this._device.load({ routerRtpCapabilities: mediaCodecs });
    // init transport ( consumer and produce )
    await this.initTransports(this._device);

    this._socket.notify({ data: { room_id: roomId, rtpCapabilities: this._device.rtpCapabilities }, type: EVENT_FOR_CLIENT.GET_PRODUCERS });
  }

  leaveRoom() {}

  getRouterRtpCapabilities(roomId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this._socket.request({ data: { room_id: roomId }, type: EVENT_FOR_CLIENT.GET_ROUTER_RTPCAPABILITIES }).then(({ data }) => {
        resolve(data.codecs);
      });
    });
  }

  async initTransports(device: Device) {
    // init sendTransport
    if (this._isProduce) {
      const { data: transportInfo } = await this._socket.request({
        data: {
          room_id: this._roomId,
          producing: true,
          consuming: false,
        },
        type: EVENT_FOR_CLIENT.CREATE_WEBRTCTRANSPORT,
      });
      const { transport_id, iceParameters, iceCandidates, dtlsParameters } = transportInfo;
      this._sendTransport = device.createSendTransport({
        id: transport_id,
        iceParameters,
        iceCandidates,
        dtlsParameters,
      });
      /* Register sendTransport listen event */
      this._sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          const { data } = await this._socket.request({
            data: { room_id: this._roomId, transport_id: this._sendTransport?.id, dtlsParameters },
            type: EVENT_FOR_CLIENT.CONNECT_WEBRTCTRANPORT,
          });

          callback();
        } catch (error) {
          errback(error as Error);
        }
      });
      this._sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
          const { data } = await this._socket.request({
            data: { room_id: this._roomId, transport_id: this._sendTransport?.id, kind, rtpParameters, appData },
            type: EVENT_FOR_CLIENT.PRODUCE,
          });
          callback(data.id);
        } catch (error) {
          errback(error as Error);
        }
      });
    }

    // init recvTransport
    if (this._isConsume) {
      const { data: transportInfo } = await this._socket.request({
        data: {
          room_id: this._roomId,
          producing: false,
          consuming: true,
        },
        type: EVENT_FOR_CLIENT.CREATE_WEBRTCTRANSPORT,
      });
      const { transport_id, iceParameters, iceCandidates, dtlsParameters } = transportInfo;
      this._recvTransport = device.createRecvTransport({
        id: transport_id,
        iceParameters,
        iceCandidates,
        dtlsParameters,
      });
      /* Register sendTransport listen event */
      this._recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          const { data } = await this._socket.request({
            data: { room_id: this._roomId, transport_id: this._recvTransport?.id, dtlsParameters },
            type: EVENT_FOR_CLIENT.CONNECT_WEBRTCTRANPORT,
          });

          callback();
        } catch (error) {
          errback(error as Error);
        }
      });
    }

    //Enable mic/webcam
    if (this._isProduce) {
      // this.enableMic();
      // this.enableWebcam();
    }
  }

  consume(id: string) {}
}

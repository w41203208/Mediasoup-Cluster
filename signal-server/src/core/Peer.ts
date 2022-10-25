const { EventEmitter } = require('../util/emitter');
import { ServerEngine } from '../engine';
import { WSTransport } from '../connect/WSTransport';

import { TimeBomb } from '../util/TimeBomb';
// import { EVENT_FROM_CLIENT_REQUEST, EVENT_FOR_TEST } from '../EVENT';
// import { CryptoCore } from '../util/CryptoCore';
import { RoomService } from '../service';

interface PeerRequestMessage {
  id: string;
  type: string;
  data: any;
}

export class Peer extends EventEmitter {
  private _id: string;
  private _ws: WSTransport | null;
  private _roomService: RoomService;
  private _bomb?: TimeBomb | null;
  private _timeoutFunction: any;

  constructor(id: string, websocket: WSTransport, roomService: RoomService) {
    super();

    this._id = id;

    /* websocket */
    this._ws = websocket;

    this._roomService = roomService;

    this._handleTransportMessage();
  }

  died() {
    if (this._timeoutFunction) clearTimeout(this._timeoutFunction);
    this._ws?.close();
    this._ws = null;
    this._bomb?.countDownReset();
    this._bomb = null;
  }

  _handleTransportMessage() {
    this._ws!.on('request', (message: PeerRequestMessage) => {
      this._roomService.handleMessage(message, this);
    });
    this._ws!.on('notification', (message: { type: string; data: any }) => {
      const { type, data } = message;
      switch (type) {
        case 'heartbeatCheck':
          if (data.msg === 'pong') {
            this.resetPing();
          }
          break;
        // default:
        //   this.emit('handleOnRoomNotification', this, type, data);
        //   break;
      }
    });
  }

  get socket() {
    return this._ws!;
  }

  get id() {
    return this._id;
  }

  setTimeBomb(bomb: TimeBomb) {
    this._bomb = bomb;

    this._bomb.setBombFunction(this._roomService.handleDisconnected);
    this.startPing();
  }

  resetPing() {
    if (this._timeoutFunction) clearTimeout(this._timeoutFunction);
    this._bomb?.countDownReset();
    this.startPing();
  }

  startPing() {
    this._timeoutFunction = setTimeout(() => {
      this._bomb!.countDownStart();
      this._ws?.notify({
        type: 'heartbeatCheck',
        data: { msg: 'ping' },
      });
    }, 10 * 1000);
  }

  notify(sendData: any) {
    this._ws?.notify(sendData);
  }

  response(sendData: any) {
    this._ws?.response(sendData);
  }
}

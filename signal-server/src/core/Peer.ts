import { EventEmitter } from '../util/emitter';
import { WSTransport } from '../connect/WSTransport';
import { RoomService } from '../service';
import { TimeBomb } from '../util/TimeBomb';
import { PeerRouter } from '../router/peerRouter';
import { MEvent } from '../router/event';
import { EVENT_FROM_CLIENT_REQUEST } from '../EVENT';

interface PeerMessage {
  identity: string;
  msg: any;
}

export class Peer extends EventEmitter {
  private _id: string;
  private _ws: WSTransport | null;
  private _roomService: RoomService;
  private _bomb?: TimeBomb | null;
  private _timeoutFunction: any;

  constructor(id: string, websocket: WSTransport, roomService: RoomService, peerRouter: PeerRouter) {
    super();

    this._id = id;

    /* websocket */
    this._ws = websocket;

    this._roomService = roomService;

    this._handleTransportMessage(peerRouter);
  }

  died() {
    if (this._timeoutFunction) clearTimeout(this._timeoutFunction);
    this._bomb?.countDownReset();
    this._bomb = null;
    this._ws?.close();
    this._ws = null;
  }

  createPeerMessage(message: any): PeerMessage {
    const peerMessage = {
      identity: this._id,
      msg: message,
    } as PeerMessage;
    return peerMessage;
  }

  _handleTransportMessage(peerRouter: PeerRouter) {
    this._ws!.on('request', (message: any) => {
      const pm = this.createPeerMessage(message);
      // version 1
      this._roomService.handleMessage(pm);

      //version 2
      const event = new MEvent(pm, 'rtc');
      peerRouter.publish(event);
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

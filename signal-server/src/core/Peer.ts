const { EventEmitter } = require('../util/emitter');
import { ServerEngine } from '../engine';
import { WSTransport } from '../connect/WSTransport';

import { TimeBomb } from '../util/TimeBomb';
// import { EVENT_FROM_CLIENT_REQUEST, EVENT_FOR_TEST } from '../EVENT';
// import { CryptoCore } from '../util/CryptoCore';
import { RTCService } from '../service';

export class Peer extends EventEmitter {
  private _id: string;
  private _ws: WSTransport | null;
  private _rtcService: RTCService;
  private _bomb?: TimeBomb | null;
  private _timeoutFunction: any;

  constructor(id: string, websocket: WSTransport, rtcService: RTCService) {
    super();

    this._id = id;

    /* websocket */
    this._ws = websocket;

    this._rtcService = rtcService;

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
    this._ws!.on('request', (message: { type: string; data: any }, response: Function) => {
      this._rtcService.handleMessage(message, response, this);
    });
    // this._ws!.on('request', (message: { type: string; data: any }, response: Function) => {
    //   const { type, data } = message;
    //   switch (type) {
    //     case EVENT_FROM_CLIENT_REQUEST.CREATE_ROOM:
    //       try {
    //         const deUserId = this.cryptoCore.decipherIv(data.peer_id);
    //         this._id = deUserId;
    //         data.peer_id = deUserId;
    //         this._listener!.handlePeerRequest(type, data, response);
    //       } catch (err) {
    //         console.log(err);
    //       }
    //       break;
    //     case EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM:
    //       try {
    //         const deUserId = this.cryptoCore.decipherIv(data.peer_id);
    //         this._id = deUserId;
    //         data.peer = this;
    //         this._listener!.handlePeerRequest(type, data, response);
    //       } catch (err) {
    //         console.log(err);
    //       }
    //       break;
    //     // test
    //     case EVENT_FOR_TEST.TEST1:
    //       console.log('test1');
    //       let sum = 0;
    //       for (let i = 0; i < 2000000000; i++) {
    //         sum += i;
    //       }
    //       response({
    //         type: 'test1',
    //         data: sum,
    //       });
    //       break;
    //     // test
    //     // test
    //     case EVENT_FOR_TEST.TEST2:
    //       console.log('test2');
    //       let sum1 = 0;
    //       for (let i = 0; i < 2000000000; i++) {
    //         sum1 += i;
    //       }
    //       response({
    //         type: 'test2',
    //         data: sum1,
    //       });
    //       break;
    //     // test
    //     default:
    //       this.emit('handleOnRoomRequest', this, type, data, response);
    //       break;
    //   }
    // });

    this._ws!.on('notification', (message: { type: string; data: any }, notify: Function) => {
      const { type, data } = message;
      switch (type) {
        default:
          this.emit('handleOnRoomNotification', this, type, data, notify);
          break;
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
}

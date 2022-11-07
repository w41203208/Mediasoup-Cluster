import { EVENT_FOR_CLIENT_NOTIFICATION } from '../EVENT';
import { Log } from '../util/Log';

export interface ISubscriber {
  update(pmessage: any): void;
}

export class RoomManagerSubscriber implements ISubscriber {
  private _log: Log = Log.GetInstance();
  private onRTCMessage: Function = () => {};
  private onNewPlayerJoinRTC: Function = () => {};
  constructor() {}
  OnNewPlayerJoinRTC(func: Function) {
    this.onNewPlayerJoinRTC = func;
  }

  OnHandleRTCMessage(func: Function) {
    this.onRTCMessage = func;
  }
  update(pmessage: any): void {
    try {
      switch (pmessage.message.type) {
        case EVENT_FOR_CLIENT_NOTIFICATION.JOIN_ROOM:
          this.onNewPlayerJoinRTC(pmessage.identity, pmessage.roomId, pmessage.message);
          break;
        default:
          this.onRTCMessage(pmessage.identity, pmessage.roomId, pmessage.message);
          break;
      }
    } catch (e: any) {
      this._log.error(e);
    }
  }
}

export class PeerSubscriber implements ISubscriber {
  private _log: Log = Log.GetInstance();

  private onHandleSignalMessage: Function = () => {};
  constructor() {}
  OnHandleSignalMesssage(func: Function) {
    this.onHandleSignalMessage = func;
  }
  update(pmessage: any): void {
    try {
      this.onHandleSignalMessage(pmessage);
    } catch (e: any) {
      this._log.error(e);
    }
  }
}

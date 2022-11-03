import { EVENT_FROM_CLIENT_REQUEST } from '../EVENT';
import { Log } from '../util/Log';

export interface ISubscriber {
  update(message: any): void;
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
      switch (pmessage.msg.type) {
        case EVENT_FROM_CLIENT_REQUEST.JOIN_ROOM:
          this.onNewPlayerJoinRTC();
          break;
        default:
          const { room_id, ...rest } = pmessage.msg.data;
          const rm = {
            id: pmessage.msg.id,
            type: pmessage.msg.type,
            data: rest,
          };
          this.onRTCMessage(pmessage.identity, room_id, rm);
          break;
      }
    } catch (e: any) {
      this._log.error(e);
    }
  }
}

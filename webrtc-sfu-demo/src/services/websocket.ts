import { EventEmitter } from "@/services/Emitter";
import { WebSocketParams, SendData } from "@/services/type";
import { v4 } from "uuid";
import { logger } from "@/util/logger";

interface In_Flight_Send {
  resolve: any;
  reject: any;
}

export class Socket extends EventEmitter {
  _disconnected: boolean = true;
  _socket?: WebSocket;
  _baseUrl?: string;
  _in_flight_send?: Map<string, In_Flight_Send> = new Map();

  constructor({ url = undefined }: WebSocketParams) {
    super();
    this._baseUrl = url;
  }

  start(token: string, roomId: string): void {
    const wsUrl = this._baseUrl!;

    if (!!this._socket || !this._disconnected) {
      return;
    }
    this._socket = new WebSocket(`${wsUrl}/?peerId=${token}&roomId=${roomId}`);

    this._disconnected = false;

    this._socket.onclose = (e) => {
      console.log("ws is closed!");
    };
    this._socket.onopen = (e) => {
      console.log("ws is connecting!");
      this.emit("connecting");
    };
    // this._socket.onmessage = this._handleOnMessage.bind(this);
    this._socket.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      const { messageType, ...rest } = data;

      switch (messageType) {
        case "request":
          this._handlerRequest(rest);
          break;
        case "response":
          this._handlerResponse(rest);
          break;
        case "notification":
          this._handlerNotification(rest);
          break;
      }
    };
  }
  close() {
    this._socket?.close();
  }
  _handlerRequest(_data: any) {}

  _handlerResponse(_data: any) {
    const { id, type, data } = _data;
    const { resolve, reject } = this._in_flight_send?.get(id)!;
    resolve({ type, data });
    this._in_flight_send?.delete(id);
  }

  _handlerNotification(_data: any) {
    const { type, data } = _data;
    switch (type) {
      case "heartbeatCheck":
        if (data.msg === "ping") {
          let sendData: SendData = {
            type: "heartbeatCheck",
            data: { msg: "pong" },
          };
          this.notify(sendData);
        }
        break;
      case "roomState":
        break;
    }

    this.emit("notification", _data);
  }

  notify(sendData: SendData): void {
    (sendData as any).messageType = "notification";
    this._socket?.send(JSON.stringify(sendData));
  }

  request(sendData: SendData): Promise<any> {
    const id = ((sendData as any).id = Date.now().toString());
    (sendData as any).messageType = "request";
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this._in_flight_send?.set(id, { resolve, reject });
    this._socket?.send(JSON.stringify(sendData));
    return promise;
  }
}

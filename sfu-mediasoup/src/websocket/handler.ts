import { WebSocket } from './index';

class Handler {
  private ws: WebSocket;
  constructor(ws: WebSocket) {
    this.ws = ws;
  }
}

import { SFUServerSocket } from '../connect/SFUServerSocket';
import { SFUServerController } from '../redis/controller';
import { ControllerFactory } from '../redis/ControllerFactory';

// require('dotenv').config();

export class SFUConnectionManager {
  private _sfuServerSockets: Map<string, SFUServerSocket>;
  constructor() {
    this._sfuServerSockets = new Map();
  }

  async getOrNewSFUConnection(ip_port: string, room_id: string): Promise<SFUServerSocket> {
    let serverSocket: SFUServerSocket;
    if (!this._sfuServerSockets.has(`${ip_port}:${room_id}`)) {
      const [ip, port] = ip_port.split(':');
      serverSocket = new SFUServerSocket(ip, port, room_id);
      this._sfuServerSockets.set(`${ip_port}:${room_id}`, serverSocket);
      // this.handleServerSocketAction(serverSocket);
      await serverSocket.start();
    } else {
      serverSocket = this._sfuServerSockets.get(`${ip_port}:${room_id}`)!;
    }

    return serverSocket;
  }

  // handleServerSocketAction(serverSocket: SFUServerSocket) {
  // serverSocket.on('request', (message: { type: string; data: any }, response: Function) => {
  //     const { type, data } = message;
  //     data.serverId = serverSocket.id;
  //     this.listener.handleServerSocketRequest(type, data, response);
  //   });

  //   serverSocket.on('close', (id: string) => {
  //     this.SFUServerSockets.delete(id);
  //   });
  // }

  // async;
}

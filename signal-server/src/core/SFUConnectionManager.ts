import { Peer } from './peer';
import { SFUServerSocket } from './SFUServerSocket';
import { SFUServerController } from '../redis/controller';
import { ServerEngine } from 'src/engine';

require('dotenv').config();

export class SFUConnectionManager {
  private peopleLimit: number; // dev 3
  private SFUServerSockets: Map<string, SFUServerSocket>;
  private listener: ServerEngine;
  constructor({ serverEngine }: any) {
    if (Number(process.env.PORT) === 9998) {
      this.peopleLimit = 10000;
    } else {
      this.peopleLimit = 2;
    }
    this.SFUServerSockets = new Map();
    this.listener = serverEngine;
  }

  getServerSocket(id: string) {
    return this.SFUServerSockets.get(id);
  }

  // 還有可能都沒選到代表全部 Server 都滿了
  async getMinimumSFUServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.listener.redisController!.SFUServerController.getAllSFUServer().then(async (data: any) => {
        try {
          let okServer = undefined;
          let i = 0;
          while (i < data.length && okServer === undefined) {
            // temp
            if (Number(process.env.PORT) === 9998) {
              // temp
              const key = data[i];
              // temp
              const [ip, port] = key.split(':');
              if (port > Number(process.env.LIMIT)) {
                // temp
                const count = await this.listener.redisController!.SFUServerController.getSFUServerCount(key);
                let new_count: number | void;
                if (count < this.peopleLimit && okServer === undefined) {
                  okServer = key;
                  new_count = await this.listener.redisController!.SFUServerController.addSFUServerCount(key);
                  if (new_count) {
                    if (new_count >= this.peopleLimit + 1) {
                      await this.listener.redisController!.SFUServerController.reduceSFUServerCount(key);
                      okServer = undefined;
                    }
                  }
                }
                // temp
              }
              // temp
              // temp
            } else {
              // temp
              const key = data[i];
              // temp
              const [ip, port] = key.split(':');
              if (port < Number(process.env.LIMIT)) {
                // temp
                const count = await this.listener.redisController!.SFUServerController.getSFUServerCount(key);
                let new_count: number | void;
                if (count < this.peopleLimit && okServer === undefined) {
                  okServer = key;
                  new_count = await this.listener.redisController!.SFUServerController.addSFUServerCount(key);
                  if (new_count) {
                    if (new_count >= this.peopleLimit + 1) {
                      await this.listener.redisController!.SFUServerController.reduceSFUServerCount(key);
                      okServer = undefined;
                    }
                  }
                }
                // temp
              }
              // temp
              // temp
            }
            // temp
            i++;
          }
          resolve(okServer);
        } catch (error) {
          console.log(error);
          reject(error);
        }
      });
    });
  }

  async connectToSFUServer(ip_port: string, room_id: string): Promise<SFUServerSocket> {
    const [ip, port] = ip_port.split(':');
    let serverSocket: SFUServerSocket;
    if (!this.SFUServerSockets.has(`${ip_port}:${room_id}`)) {
      serverSocket = new SFUServerSocket(ip, port);
      this.handleServerSocketAction(serverSocket);
      await serverSocket.start(room_id);
      this.SFUServerSockets.set(`${ip_port}:${room_id}`, serverSocket);
    } else {
      serverSocket = this.SFUServerSockets.get(`${ip_port}:${room_id}`)!;
    }

    return serverSocket;
  }

  handleServerSocketAction(serverSocket: SFUServerSocket) {
    serverSocket.on('request', (message: { type: string; data: any }, response: Function) => {
      const { type, data } = message;
      data.serverId = serverSocket.id;
      this.listener.handleServerSocketRequest(type, data, response);
    });

    serverSocket.on('close', (id: string) => {
      this.SFUServerSockets.delete(id);
    });
  }

  // async;
}

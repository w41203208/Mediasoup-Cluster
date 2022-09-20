import { Peer } from '../common/peer';
import { SFUServerSocket } from '../common/SFUServerSocket';
import { SFUServerController } from '../redis/controller';

require('dotenv').config();

export class SFUConnectionManager {
  private peopleLimit: number = 3; // dev 3
  private SFUServerSockets: Map<string, SFUServerSocket>;
  private SFUServerController: SFUServerController;
  constructor({ SFUServerController }: any) {
    this.SFUServerSockets = new Map();
    this.SFUServerController = SFUServerController;
  }

  getServerSocket(id: string) {
    return this.SFUServerSockets.get(id);
  }

  // 還有可能都沒選到代表全部 Server 都滿了
  async getMinimumSFUServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.SFUServerController.getAllSFUServer().then(async (data: any) => {
        try {
          let okServer = undefined;
          let i = 0;
          while (i < data.length && okServer === undefined) {
            if (Number(process.env.PORT) === 9998) {
              const key = data[i];
              const [ip, port] = key.split(':');
              if (port > Number(process.env.LIMIT)) {
                const count = await this.SFUServerController.getSFUServerCount(key);
                let new_count: number | void;
                if (count < this.peopleLimit && okServer === undefined) {
                  okServer = key;
                  new_count = await this.SFUServerController.addSFUServerCount(key);
                  if (new_count) {
                    if (new_count >= this.peopleLimit + 1) {
                      await this.SFUServerController.reduceSFUServerCount(key);
                      okServer = undefined;
                    }
                  }
                }
              }
            } else {
              const key = data[i];
              const [ip, port] = key.split(':');
              if (port < Number(process.env.LIMIT)) {
                const count = await this.SFUServerController.getSFUServerCount(key);
                let new_count: number | void;
                if (count < this.peopleLimit && okServer === undefined) {
                  okServer = key;
                  new_count = await this.SFUServerController.addSFUServerCount(key);
                  if (new_count) {
                    if (new_count >= this.peopleLimit + 1) {
                      await this.SFUServerController.reduceSFUServerCount(key);
                      okServer = undefined;
                    }
                  }
                }
              }
            }
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

  async connectToSFUServer(ip_port: string, room_id: string) {
    const [ip, port] = ip_port.split(':');
    let serverSocket: SFUServerSocket;
    if (!this.SFUServerSockets.has(ip_port)) {
      serverSocket = new SFUServerSocket(ip, port);
      await serverSocket.start(room_id);
      this.SFUServerSockets.set(`${ip_port}:${room_id}`, serverSocket);
    } else {
      serverSocket = this.SFUServerSockets.get(`${ip_port}:${room_id}`)!;
    }
    return serverSocket;
  }

  // async;
}

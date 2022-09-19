import { Peer } from '../common/peer';
import { SFUServerSocket } from '../common/SFUServerSocket';
import { SFUServerController } from '../redis/controller/SFUServerController';

export class SFUConnectionManager {
  private peopleLimit: number = 5;
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
            const key = data[i];
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
            i++;
          }
          // 這裡要防範沒有選到任何伺服器的做法
          if (!this.SFUServerSockets.has(okServer)) {
            await this.connectToSFUServer(okServer);
          }
          resolve(okServer);
        } catch (error) {
          console.log(error);
          reject(error);
        }
      });
    });
  }

  async connectToSFUServer(ip_port: string) {
    const [ip, port] = ip_port.split(':');
    const serverSocket = new SFUServerSocket(ip, port);
    await serverSocket.start();
    this.SFUServerSockets.set(serverSocket.id, serverSocket);
    return serverSocket;
  }
}

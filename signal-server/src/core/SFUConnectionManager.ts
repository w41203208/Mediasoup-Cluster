import { SFUServerSocket } from '../connect/SFUServerSocket';
import { SFUServerController } from '../redis/controller';
import { ServerEngine } from 'src/engine';
import { ControllerFactory } from 'src/redis/ControllerFactory';

// require('dotenv').config();

let num = 0;

export class SFUConnectionManager {
  private peopleLimit: number;
  private SFUServerSockets: Map<string, SFUServerSocket>;
  private SFUServerController: SFUServerController;

  private listener: ServerEngine;
  constructor(listener: ServerEngine, controllerFactroy: ControllerFactory) {
    if (Number(process.env.PORT) === 9998 || Number(process.env.PORT) === 9997) {
      this.peopleLimit = 10000;
    } else {
      this.peopleLimit = 100;
    }
    this.SFUServerSockets = new Map();

    this.SFUServerController = controllerFactroy.getControler('SFU') as SFUServerController;

    this.listener = listener;
  }

  getServerSocket(id: string) {
    return this.SFUServerSockets.get(id);
  }

  // 還有可能都沒選到代表全部 Server 都滿了
  async getMinimumSFUServer(): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      this.SFUServerController.getAllSFUServer().then(async (data: any) => {
        try {
          let okServer = undefined;
          let i = 0;
          while (i < data.length && okServer === undefined) {
            const key = data[i];
            if (Number(process.env.PORT) === 9998) {
              okServer = await this.tempSearchSFUServerFunction(key);
            } else {
              okServer = await this.searchSFUServer(key);
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

  async searchSFUServer(key: string): Promise<string | undefined> {
    let okServer = undefined;
    const [ip, port] = key.split(':');
    if (Number(port) < Number(process.env.LIMIT)) {
      const count = await this.SFUServerController.getSFUServerCount(key);
      console.log('get count: ', count);
      if (count < this.peopleLimit && okServer === undefined) {
        okServer = key;
        const new_count = await this.SFUServerController.addSFUServerCount(key);
        console.log('get new_count: ', new_count);
        if (new_count >= this.peopleLimit + 1) {
          ++num;
          console.log('Num is: ', num);
          await this.SFUServerController.reduceSFUServerCount(key); // 在裡面印看看
          okServer = undefined;
        }
      }
    }
    return okServer;
  }

  async tempSearchSFUServerFunction(key: string): Promise<string | undefined> {
    let okServer = undefined;
    const [ip, port] = key.split(':');
    if (Number(port) > Number(process.env.LIMIT)) {
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
    return okServer;
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

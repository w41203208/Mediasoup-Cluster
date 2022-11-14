import { SFUServerController } from '../redis/controller';
import { ControllerFactory } from '../redis/ControllerFactory';

//test
let num = 0;

export class SFUAllocator {
  private peopleLimit: number;
  private SFUServerController: SFUServerController;

  constructor(cf: ControllerFactory) {
    this.peopleLimit = 1000;
    this.SFUServerController = cf.getController('SFU') as SFUServerController;
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
            okServer = await this.searchSFUServer(key);
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
    const count = await this.SFUServerController.getSFUServerCount(key);
    console.log('get count: ', count);
    if (count < this.peopleLimit && okServer === undefined) {
      okServer = key;
      const new_count = await this.SFUServerController.addSFUServerCount(key);
      console.log('get new_count: ', new_count);
      if (new_count >= this.peopleLimit + 1) {
        ++num;
        console.log('Num is: ', num);
        await this.SFUServerController.reduceSFUServerCount(key);
        okServer = undefined;
      }
    }
    return okServer;
  }

  async misallocateSFUServer(id: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      await this.SFUServerController.reduceSFUServerCount(id);
      resolve();
    });
  }
}

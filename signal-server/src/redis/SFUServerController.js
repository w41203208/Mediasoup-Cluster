const { ControllerImp } = require('./ControllerImp.js');
class SFUServerController extends ControllerImp {
  constructor(redisClient) {
    super();
    this._rc = redisClient;
  }

  getAllSFUServer() {
    return new Promise(async (resolve, reject) => {
      try {
        let temp_list = [];
        const servers = await this._rc.hGetAll('SFUServer');
        Object.entries(servers).forEach(([key, value]) => {
          temp_list.push(key);
        });
        resolve(temp_list);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  getSFUServerCount(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const count = await this._rc.get(id);

        resolve(count);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  addSFUServerCount(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const count = await this._rc.INCRBY(id, 1);
        resolve(count);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }
  reduceSFUServerCount(id) {
    return new Promise(async (resolve, reject) => {
      try {
        await this._rc.INCRBY(id, -1);
        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  set() {}
}

module.exports = {
  SFUServerController: SFUServerController,
};

const { ControllerImp } = require('./ControllerImp.js');
class SFUServerController extends ControllerImp {
  constructor(redisClient) {
    super();
    this._rc = redisClient;
    // this.testInit();
  }

  testInit() {
    return new Promise(async (resovle, reject) => {
      try {
        await this._rc.hSet('SFUServer', {
          '192.168.1.98:8585': this.transformToJSON({
            count: 0,
          }),
          '192.168.1.98:7878': this.transformToJSON({
            count: 0,
          }),
        });
        resovle();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }
  getAllSFUServer() {
    return new Promise(async (resolve, reject) => {
      try {
        let temp_map = {};
        const servers = await this._rc.hGetAll('SFUServer');
        Object.entries(servers).forEach(([key, value]) => {
          temp_map[key] = this.transformToJS(value);
        });
        resolve(temp_map);
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

const fs = require('fs');

export class ControllerLoader {
  constructor() {}
  static bootstrap(): Promise<Array<any>> {
    return new Promise((resolve, reject) => {
      let controller_list: Array<any> = [];
      fs.readdir(`${__dirname}/controller`, (err: Error, files: any) => {
        files.forEach((file: any) => {
          const controller = require(`./controller/${file}`);
          Object.entries(controller).forEach(([key, controller]) => {
            controller_list.push(controller);
          });
        });
        resolve(controller_list);
      });
    });
  }
}

const folder = './controller/';

const fs = require('fs');

export class ControllerLoader {
  constructor() {}
  static bootstrap() {
    let controller_list: Array<any> = [];
    fs.readdir(`${__dirname}\\controller\\`, (err: Error, files: any) => {
      files.forEach((file: any) => {
        const controller = require(`./controller/${file}`);
        controller_list.push(controller);
      });
    });

    return controller_list;
  }
}

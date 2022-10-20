import { Router, Request, Response } from 'express';
import { IncomingMessage } from 'http';
import { RoomController } from '../redis/controller';
import { ControllerFactory } from '../redis/ControllerFactory';

export class CommonService {
  private _roomController: RoomController;
  private _router: Router;
  constructor(cf: ControllerFactory) {
    this._roomController = cf.getController('Room') as RoomController;

    const express = require('express');

    this._router = express.Router();

    this._registerRouterHandler();
  }

  get router() {
    return this._router;
  }

  private _registerRouterHandler() {
    this._router.use((incomingMessage: IncomingMessage, req: Request, res: Response, next: any) => {
      // const parameter = this.urlParse(incomingMessage.url);
      // this.cryptoCore.decipherIv(parameter);
      next();
    });
    this._router.get('/getRoomList', (incomingMessage: IncomingMessage, res: Response) => {
      try {
        // this._listener
        //   .getAllRoom()
        //   .then((response) => {
        //     return res.send(JSON.stringify(response));
        //   })
        //   .catch((err) => {
        //     console.log(err);
        //   });
      } catch (e) {
        console.log(e);
        res.status(403).json({ e });
      }
    });
  }
}

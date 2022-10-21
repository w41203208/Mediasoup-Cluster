import { Router, Request, Response } from 'express';
import { IncomingMessage } from 'http';
import { urlParse } from '../util/tool';
import { RoomController } from '../redis/controller';
import { ControllerFactory } from '../redis/ControllerFactory';
import { CryptoCore } from '../util/CryptoCore';
const express = require('express');

export class CommonService {
  private _roomController: RoomController;
  private _router: Router;
  private _cryptoCore: CryptoCore;
  constructor(cf: ControllerFactory, cryptoCore: CryptoCore) {
    this._roomController = cf.getController('Room') as RoomController;
    this._cryptoCore = cryptoCore;

    this._router = express.Router();
    this._registerRouterHandler();
  }

  get router() {
    return this._router;
  }

  private _registerRouterHandler() {
    this._router.use((req: Request, res: Response, next: any) => {
      try {
        const parameter = urlParse(req.url, '/?id=([\\w\\s\\d%]*)');
        const encrypted = this._cryptoCore.decipherIv(parameter);
        next();
      } catch (error: any) {
        res.status(403).json({
          msg: error.message,
        });
      }
    });
    this._router.get('/getRoomList', async (req: Request, res: Response) => {
      try {
        const temp_list = await this._roomController.getAllRoom();
        const roomList: { roomId: string; roomName: string; roomUserSize: number }[] = [];
        temp_list.forEach((values: { playerList: Array<string>; id: string; name: string }) => {
          roomList.push({
            roomId: values.id,
            roomName: values.name,
            roomUserSize: values.playerList.length,
          });
        });

        res.send(JSON.stringify(roomList));
      } catch (e) {
        console.log(e);
        res.status(403).json({ e });
      }
    });
  }
}

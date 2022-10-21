import { Router, Request, Response } from 'express';
import { IncomingMessage } from 'http';
import { urlParse } from '../util/tool';
import { CryptoCore } from '../util/CryptoCore';

const express = require('express');

export class AuthService {
  private _router: Router;
  private _cryptoCore: CryptoCore;
  constructor(cryptoCore: CryptoCore) {
    this._cryptoCore = cryptoCore;

    this._router = express.Router();
    this._registerRouterHandler();
  }

  get router() {
    return this._router;
  }

  private _registerRouterHandler() {
    this._router.get('/getUuid', (req: Request, res: Response) => {
      try {
        const parameter = urlParse(req.url, '/?id=([\\w\\s\\d%]*)'); //https://5xruby.tw/posts/15min-regular-expression
        const encrypted = this._cryptoCore.cipherIv(parameter!);
        res.send(JSON.stringify(encrypted));
      } catch (error: any) {
        res.status(403).send({
          msg: error.message,
        });
      }
    });
  }
}

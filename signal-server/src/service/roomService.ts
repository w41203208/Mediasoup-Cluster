import { CryptoCore } from '../util/CryptoCore';

export class RoomService {
  private _cryptoCore: CryptoCore;
  constructor(cryptoCore: CryptoCore) {
    this._cryptoCore = cryptoCore;
  }

  handleMessage(message: { type: string; data: any }, response: Function) {}
}

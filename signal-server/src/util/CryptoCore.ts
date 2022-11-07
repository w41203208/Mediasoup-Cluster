import Crypto from 'crypto';

export class CryptoCore {
  private key: string;
  constructor(cryptoKey: string) {
    this.key = cryptoKey;
  }

  cipherIv(params: string) {
    const iv = Crypto.randomBytes(12);
    const cipher = Crypto.createCipheriv('aes-128-gcm', this.keyToBufferHex(this.key), iv);
    var uuId = Date.now() + ':' + params;
    const encrypted = Buffer.concat([iv, cipher.update(uuId), cipher.final(), cipher.getAuthTag()]);
    return encrypted.toString('base64');
  }

  decipherIv(params: any) {
    const deUuId = params instanceof Buffer ? params : Buffer.from(params, 'base64');
    const copiedBuf = Uint8Array.prototype.slice.call(deUuId);
    const tag = copiedBuf.slice(deUuId.length - 16, deUuId.length);
    const iv = copiedBuf.slice(0, 12);
    const toDecrypt = copiedBuf.slice(12, deUuId.length - tag.length);

    const decipher = Crypto.createDecipheriv('aes-128-gcm', this.keyToBufferHex(this.key), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(toDecrypt), decipher.final()]);
    const ans = decrypted.toString('utf8').split(':');
    //Token過期時間
    if (Date.now() - parseInt(ans[0]) >= 3600000) {
      throw new Error('Token was expired');
    } else {
      return decrypted.toString('utf8');
    }
  }

  keyToBufferHex(key: string): Buffer {
    return Buffer.from(key, 'hex');
  }
}

import Crypto from 'crypto';

export class CryptoCore {
  private iv: Buffer;
  private key: string;
  constructor(cryptoKey: string) {
    this.iv = Crypto.randomBytes(12);
    this.key = cryptoKey;
  }

  cipherIv(params: string) {
    const cipher = Crypto.createCipheriv('aes-128-gcm', this.keyToBufferHex(this.key), this.iv);
    var uuId = Date.now() + ':' + params;
    const encrypted = Buffer.concat([this.iv, cipher.update(uuId), cipher.final(), cipher.getAuthTag()]);
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
    if (Date.now() - parseInt(ans[0]) >= 3600000) {
      throw new Error("token was expired");
    } else {
      return decrypted.toString('utf8');
    }
  }

  keyToBufferHex(key: string): Buffer {
    return Buffer.from(key, 'hex');
  }
}

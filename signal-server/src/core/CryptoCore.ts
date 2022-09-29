import Crypto from 'crypto';

export class CryptoCore {
 private iv: Buffer;
 private key: string;
 private cipherKey: Buffer;
 public cipherIv: Function;
 public decipherIv: Function;
 constructor() {
  this.iv = Crypto.randomBytes(12);
  this.key = process.env.CRYPTO_KEY!;
  this.cipherKey = Buffer.from(this.key, "hex");

  this.cipherIv = (params: string) => {
   const cipher = Crypto.createCipheriv('aes-128-gcm', this.cipherKey, this.iv);
   var uuId = Date.now() + ":" + params;
   const encrypted = Buffer.concat([this.iv, cipher.update(uuId), cipher.final(), cipher.getAuthTag()]);
   return encrypted.toString('base64')
  }

  this.decipherIv = (params: any) => {
   const deUuId = params instanceof Buffer ? params : Buffer.from(params, "base64");
   const copiedBuf = Uint8Array.prototype.slice.call(deUuId);
   const tag = copiedBuf.slice(deUuId.length - 16, deUuId.length);
   const iv = copiedBuf.slice(0, 12)
   const toDecrypt = copiedBuf.slice(12, deUuId.length - tag.length);
   const cipherKey = Buffer.from(this.key, "hex");
   const decipher = Crypto.createDecipheriv('aes-128-gcm', cipherKey, iv);
   decipher.setAuthTag(tag);
   const decrypted = Buffer.concat([decipher.update(toDecrypt), decipher.final()]);
   return decrypted.toString('utf8')
  }
 }
}
// // 要讓 Node 環境允許未授權的憑證，不然就是要使用以下方法，讓 Node 不會拒絕未授權憑證。
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
module.exports = {
  ServerSetting: {
    listenIp: '127.0.0.1',
    listenPort: 9999,
    sslCert: './ssl/cert.pem',
    sslKey: './ssl/key.pem',
  },
  MediasoupSetting: {
    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    },
  },
};

const keygenerateurl = 'http://n.sfs.tw/content/index/11830';

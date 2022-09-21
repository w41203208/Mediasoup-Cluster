require('dotenv').config();

export const config = {
  ServerSetting: {
    listenIp: '0.0.0.0',
    listenPort: Number(process.env.PORT),
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

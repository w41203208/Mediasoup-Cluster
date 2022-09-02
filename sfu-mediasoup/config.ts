const os = require('os');

module.exports = {
  ServerSetting: {
    listenIp: '127.0.0.1',
    listenPort: 8585,
    sslCert: './ssl/cert.pem',
    sslKey: './ssl/key.pem',
  },
  MediasoupSetting: {
    numWorkers: 2,
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

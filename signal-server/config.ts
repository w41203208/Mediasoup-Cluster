require('dotenv').config();

const os = require('os');
const ifaces = os.networkInterfaces();

const getLocalIp = () => {
  let localIp = '127.0.0.1';
  Object.keys(ifaces).forEach((ifname) => {
    for (const iface of ifaces[ifname]) {
      // Ignore IPv6 and 127.0.0.1
      if (iface.family !== 'IPv4' || iface.internal !== false) {
        continue;
      }
      // Set the local ip to the first IPv4 address found and exit the loop
      localIp = iface.address;
    }
  });
  return localIp;
};

export const config = {
  ServerSetting: {
    ip: getLocalIp(),
    listenIp: process.env.DOMAIN!,
    listenPort: Number(process.env.PORT),
    sslCert: './ssl/cert.pem',
    sslKey: './ssl/key.pem',
    cryptoKey: process.env.CRYPTO_KEY!,
    redisHost: process.env.REDIS_HOST!,
    redisDBIndex: process.env.REDIS_DB_INDEX!,
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
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '4d0032',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    },
  },
};

const keygenerateurl = 'http://n.sfs.tw/content/index/11830';

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

module.exports = {
  ServerSetting: {
    listenIp: '127.0.0.1',
    listenPort: 8585,
    sslCert: './ssl/cert.pem',
    sslKey: './ssl/key.pem',
  },
  MediasoupSetting: {
    numWorkers: 2,
    worker: {
      rtcMinPort: 30000, // 跟著跑的沒錯
      rtcMaxPort: 31000, //
      logLevel: 'debug',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        // 'srtp',
        // 'rtcp'
        // 'rtx',
        // 'bwe',
        // 'score',
        // 'simulcast',
        // 'svc'
      ],
    },
    router: {},
    // WebRtcTransport settings
    webRtcTransport: {
      listenIps: [
        {
          ip: '127.0.0.1',
          // announcedIp: getLocalIp(), // replace by public IP address
        },
      ],
      maxIncomingBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
    },
  },
};

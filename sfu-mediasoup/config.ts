const os = require("os");
const ifaces = os.networkInterfaces();

const results = Object.create(null); // Or just '{}', an empty object

console.log("MEDIASOUP_LISTEN_IP: [%s]", process.env.MEDIASOUP_LISTEN_IP);
console.log("MEDIASOUP_PORT: [%s]", process.env.PORT);
console.log("MEDIASOUP_ANNOUNCED_IP: [%s]", process.env.MEDIASOUP_ANNOUNCED_IP);

const getLocalIp = () => {
  let localIp = "127.0.0.1";
  Object.keys(ifaces).forEach((ifname) => {
    for (const iface of ifaces[ifname]) {
      // Ignore IPv6 and 127.0.0.1
      if (iface.family !== "IPv4" || iface.internal !== false) {
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
    listenIp: process.env.MEDIASOUP_LISTEN_IP,
    listenPort: process.env.PORT || 8585,
    sslCert: "./ssl/cert.pem",
    sslKey: "./ssl/key.pem",
    redisHost: process.env.REDIS_HOST!,
  },
  MediasoupSetting: {
    numWorkers: 2, //Object.keys(os.cpus()).length
    worker: {
      rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT) || 30001,
      rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT) || 30100,
      logLevel: "warn",
      logTags: [
        "info",
        "ice",
        "dtls",
        "rtp",
        "srtp",
        "rtcp",
        "rtx",
        "bwe",
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
          ip: process.env.MEDIASOUP_LISTEN_IP,
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP, // replace by public IP address
        },
      ],
      maxIncomingBitrate: 5000000,
      initialAvailableOutgoingBitrate: 1000000,
    },
    pipeTransport: {
      listenIps: {
        ip: process.env.MEDIASOUP_LISTEN_IP,
        announcedIp: getLocalIp(), // replace by public IP address
      },
    },
  },
};

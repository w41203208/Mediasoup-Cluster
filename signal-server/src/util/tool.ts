const os = require('os');
const ifaces = os.networkInterfaces();

export const getLocalIp = () => {
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

export const urlParse = (url: string, match: string) => {
  const pattern = new RegExp(match);
  const matchAns = url.match(pattern); //  /\/?room_id=(\w*)/
  if (!matchAns) {
    return;
  }
  const newUrl = matchAns[1];
  return newUrl;
};

function stringToArray8(str: string): Uint8Array {
  const enc = new TextEncoder();
  const transformString = enc.encode(str);

  const buffer = new ArrayBuffer(str.length);
  const view = new Uint8Array(buffer);

  view.forEach((v, index) => {
    view[index] = transformString[index];
  });

  return view;
}

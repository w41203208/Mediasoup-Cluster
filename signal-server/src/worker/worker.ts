const { parentPort } = require('worker_threads');

// function asyncOnMessageWrap(fn: Function) {
//   return async function (msg: any) {
//     parentPort?.postMessage(await fn(msg));
//   };
// }

parentPort?.on('message', (msg) => {
  console.log('Worker recieved msg', msg);
});

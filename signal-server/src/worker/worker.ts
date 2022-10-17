const { parentPort } = require('worker_threads');
const { Mutex } = require('./mutex');

const { load } = Atomics;

function test(buffer, bufferNum) {
  const shared = new Uint8Array(buffer);
  const sharedNum = new Uint32Array(bufferNum);
  const mutex = new Mutex(shared, 0);
  while (load(sharedNum, 0) > 0) {}
  mutex.exec(() => {
    console.log('test');
  });
}

parentPort.on('message', (msg) => {
  console.log('Worker recieved msg', msg);
  test(msg.buffer, msg.bufferNum);
});

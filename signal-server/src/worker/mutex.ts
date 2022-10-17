const UNLOCKED = 0;
const LOCKED = 1;

const { compareExchange, wait, notify } = Atomics;

class Mutexx {
  private _shared;
  private _index;
  constructor(shared, index) {
    this._shared = shared;
    this._index = index;
  }
  acquire() {
    if (compareExchange(this._shared, this._index, UNLOCKED, LOCKED) === UNLOCKED) {
      return;
    }
    wait(this._shared, this._index, LOCKED);
    this.acquire();
  }

  release() {
    if (compareExchange(this._shared, this._index, LOCKED, UNLOCKED) !== LOCKED) {
      throw new Error('was not acquired');
    }
    notify(this._shared, this._index, 1);
  }
  exec(fn) {
    this.acquire();
    try {
      return fn();
    } finally {
      this.release();
    }
  }
}

module.exports = {
  Mutex: Mutexx,
};

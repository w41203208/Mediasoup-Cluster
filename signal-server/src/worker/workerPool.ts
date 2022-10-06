import { v4 } from 'uuid';
import { Worker } from 'worker_threads';

interface WorkerPoolContstruct {
  path: string;
  size: number;
  strategy: string;
}

enum STRATEGIES {
  ROUNDROBIN = 'roundrobin',
  RANDOM = 'random',
  LEASTBUSY = 'leastbusy',
}

export class WorkerPool {
  private _size: number;
  private _strategy: string;
  private _workerIndex: number;

  private _workers: Array<Worker> = [];
  private _next_command_id = 0;
  constructor({ path, size, strategy }: WorkerPoolContstruct) {
    this._size = size;
    this._strategy = strategy;

    this._workerIndex = 0;
    this._initialize(path);
  }

  private _initialize(path: string) {
    for (let i = 0; i < this._size; i++) {
      const worker = new Worker(path);
      this._workers.push(worker);
    }
  }
  private _getWorker() {
    let id = 0;
    if (this._strategy === 'random') {
      id = Math.floor(Math.random() * this._size);
    } else if (this._strategy === 'roundrobin') {
      if (this._workerIndex >= this._size) this._workerIndex = 0;
      id = this._workerIndex;
      this._workerIndex++;
    }
    // else if (this._strategy === 'leastbusy') {
    //   let min = Infinity;
    //   for (let i = 0; i < this._size; i++) {
    //     let worker = this._workers[i];
    //     if (worker.in_flight_commands.size < min) {
    //       min = worker.in_flight_commands.size;
    //       id = i;
    //     }
    //   }
    // }
    console.log('Selected Worker:', id);
    return this._workers[id];
  }

  exec(method: string, ...args: any) {
    const id = `${v4() + this._next_command_id++}`;
    const worker = this._getWorker();
    worker.postMessage({ method, params: args, id });
  }
}

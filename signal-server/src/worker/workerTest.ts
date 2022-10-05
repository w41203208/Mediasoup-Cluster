import { WorkerPool } from './workerPool';

export const TEST = () => {
  const workerPool = new WorkerPool({ path: './src/worker/worker.ts', size: 2, strategy: 'roundrobin' });

  workerPool.exec('test', () => {
    console.log('test');
  });
};

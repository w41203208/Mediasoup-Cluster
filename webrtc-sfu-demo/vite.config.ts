import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import fs from 'fs';

// https://vitejs.dev/config/
export default ({ mode }) => {
  const env = loadEnv(mode, __dirname);
  return defineConfig({
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      https: {
        key: fs.readFileSync(`${__dirname}/.cert/key.pem`),
        cert: fs.readFileSync(`${__dirname}/.cert/cert.pem`),
      },
    },
    plugins: [vue()],
    env,
  });
};

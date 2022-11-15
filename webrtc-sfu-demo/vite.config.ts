import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import fs from "fs";

// https://vitejs.dev/config/
export default ({ command, mode }) => {
  const env = loadEnv(mode, process.cwd());
  console.log("Command：", command);
  console.log("Env：    ", env);
  return defineConfig({
    // css: { // 全域引入
    //   preprocessorOptions: {
    //     scss: {
    //       additionalData: `@import "@/styles/base.scss";`
    //     }
    //   }
    // },
    resolve: {
      extensions: [".js", ".ts"],
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    server: {
      https: {
        key: fs.readFileSync(`${__dirname}/.cert/key.pem`),
        cert: fs.readFileSync(`${__dirname}/.cert/cert.pem`),
      },
      port: Number(env.VITE_PORT),
    },
    plugins: [vue()],
    env,
  });
};

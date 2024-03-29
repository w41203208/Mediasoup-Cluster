import { RtpCodecCapability, WebRtcTransportConstructorOptions, Worker } from 'mediasoup/node/lib/types';

interface sslOption {
  key: string;
  cert: string;
}

interface RouterOptions {
  mediaCodecs: Array<RtpCodecCapability>;
}

interface ServerOptions {
  ip: string;
  ssl: sslOption;
  port: number;
}

interface RedisClientOptions {
  redisHost: string;
}
interface MediasoupOptions {
  numWorkers: number;
  workerSettings: Record<string, any>;
  webRtcTransportSettings: Record<string, any>;
  pipeTransportSettings: Record<string, any>;
}

interface EngineOptions {
  serverOption: ServerOptions;
  mediasoupOption: MediasoupOptions;
  redisClientOption: RedisClientOptions;
}

export { sslOption, ServerOptions, MediasoupOptions, EngineOptions, RouterOptions, RedisClientOptions };

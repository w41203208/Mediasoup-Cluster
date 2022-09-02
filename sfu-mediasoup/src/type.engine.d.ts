import { RtpCodecCapability } from 'mediasoup/node/lib/types';

interface sslOption {
  key: string;
  cert: string;
}

interface RouterOptions {
  mediaCodecs: Array<RtpCodecCapability>;
}

interface ServerOptions {
  ssl: sslOption;
  port: number;
}
interface MediasoupOptions {
  numWorkers: number;
}

interface EngineOptions {
  serverOption: ServerOptions;
  mediasoupOption: MediasoupOptions;
}

export {
  sslOption,
  ServerOptions,
  MediasoupOptions,
  EngineOptions,
  RouterOptions,
};

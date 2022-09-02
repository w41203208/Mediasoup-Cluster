// emitter
export type Callback = (...args: any) => void;

// websocket
export interface WebSocketParams {
  url: string | undefined;
}
export interface SendData {
  data: {};
  type: string;
}

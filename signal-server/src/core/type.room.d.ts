interface PeerRequestHandler {
  peer: Peer;
  type: string;
  data: Record<string, any> | any;
  response: Function;
}

interface Handler {
  peer: Peer;
  data: Record<string, any> | any;
  response: Function;
}

interface RoomConstructor {
  roomId: string;
  roomName: string;
  roomOwner: string;
}

// interface RoomConstructor {
//   roomOption: RoomOptions;
//   roomId: string;
//   roomName: string;
//   roomOwner: string;
//   mediaCodecs: Record<string, any>;
//   sfuConnectionManager: SFUConnectionManager;
//   redisClient: RedisClient;
//   controllerFactory: ControllerFactory;

//   listener: ServerEngine;
// }

interface PubHandlerMapData {
  count: number;
  type: string;
  data: Record<string, any>;
}

export { PeerRequestHandler, Handler, RoomConstructor, PubHandlerMapData };

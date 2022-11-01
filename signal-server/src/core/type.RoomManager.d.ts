interface DataJoinRoom {
  roomId: string;
  playerId: string;
  playerServerId: string;
  playerRouterId: string;
}

interface PubHandlerMapData {
  // add pubRoomID and pubPlayerID
  count: number;
  type: string;
  data: Record<string, any>;
}

enum PubHandlerType {
  GETPRODUCER_COMPLETE = 'getProducerComplete',
}

export { DataJoinRoom, PubHandlerMapData, PubHandlerType };

export const EVENT_FROM_CLIENT_REQUEST = {
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  GET_PRODUCERS: 'getProducers',
  GET_ROUTER_RTPCAPABILITIES: 'getRouterRtpCapabilities',
  CREATE_WEBRTCTRANSPORT: 'createWebRTCTransport',
  CONNECT_WEBRTCTRANPORT: 'connectWebRTCTransport',
  PRODUCE: 'produce',
  CONSUME: 'consume',
  GET_ROOM_INFO: 'getRoomInfo',
  LEAVE_ROOM: 'leaveRoom',
  CLOSE_ROOM: 'closeRoom',
};

export const EVENT_FOR_CLIENT_NOTIFICATION = {
  NEW_CONSUMER: 'newConsumer',
};

export const EVENT_FOR_SFU = {
  CREATE_ROUTER: 'createRouter',
  GET_ROUTER_RTPCAPABILITIES: 'getRouterRtpCapabilities',
  CREATE_WEBRTCTRANSPORT: 'createWebRTCTransport',
  CONNECT_WEBRTCTRANPORT: 'connectWebRTCTransport',
  CREATE_PRODUCE: 'createProduce',
  CREATE_CONSUME: 'createConsume',
  CREATE_PIPETRANSPORT: 'createPipeTransport',
  CONNECT_PIPETRANSPORT: 'connectPipeTransport',
  CREATE_PIPETRANSPORT_PRODUCE: 'createPipeTransportProduce',
  CREATE_PIPETRANSPORT_CONSUME: 'createPipeTransportConsume',
  CLOSE_TRANSPORT: 'closeTransport',
};

export const EVENT_FROM_SFU = { CONNECT_PIPETRANSPORT: 'connectPipetransport' };

export const EVENT_FOR_TEST = {
  TEST1: 'test1',
  TEST2: 'test2',
};

export const EVENT_PUBLISH = {
  CREATE_PIPETRANSPORT_CONSUME: 'createPipeTransportConsume',
  CREATE_CONSUME: 'createConsume',
  EVENT_EXECUTE_COMPLETE: 'eventExecuteComplete',
};

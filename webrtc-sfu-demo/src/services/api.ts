import axios from './axios';

export const getUuidByName = (name: string) => axios({ url: `auth/getUuid/?id=${name}`, method: 'get' });

export const getRoomByUuId = (uuId: string) => axios({ url: `room/getRoomList/?id=${uuId}`, method: 'get' });

export const createRoomByUuId = (uuId: string, roomName: string) =>
  axios({ url: `room/createRoom/?id=${uuId}`, method: 'post', data: { room_name: roomName } });

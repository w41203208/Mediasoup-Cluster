import axios from './axios';

export const getUuidByName = (name: string) => axios({ url: `auth/getUuid/?id=${name}`, method: 'get' });

export const getRoomByUuId = (uuId: string) => axios({ url: `common/getRoomList/?id=${uuId}`, method: 'get' });

import axios from './axios'

export const getUuidByName = (name: string) => axios({ url: `/getUuid/?id=${name}`, method: 'get' })

export const getRoomByUuId = (uuId: string) => axios({ url: `/getRoomList/?id=${uuId}`, method: 'get' })
import axios from './axios'

export const getUuidByName = (name: string) => axios({ url: `/getUuid/${name}`, method: 'get' })

export const getRoomByUuId = (uuId: string) => axios({ url: "/getRoomList", method: 'post', data: { uuId } })
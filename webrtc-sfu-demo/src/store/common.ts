import { defineStore } from "pinia";

import { getRoomByUuId, createRoomByUuId } from "@/services/api";

export const useCommonStore = defineStore({
  id: "common",
  state: () => ({
    refreshCount: 0,
    roomList: [] as Array<any>,
  }),
  getters: {},
  actions: {
    refreshRoomList() {
      this.refreshCount++;
    },
    async createRoom(uuid: string, roomName: string) {
      const res = (await createRoomByUuId(uuid, roomName)) as any;
      this.roomList = [
        ...this.roomList,
        {
          roomId: res.data.room_id,
          roomName: res.data.room_name,
          roomUserSize: res.data.room_peopleNum,
        },
      ];
    },
    async getRoomList(uuid: string) {
      const res = (await getRoomByUuId(uuid)) as any;
      this.roomList = res.data;
    },
  },
});

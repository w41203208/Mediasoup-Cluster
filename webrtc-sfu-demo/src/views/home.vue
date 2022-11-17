<template>
  <div class="flex items-center">
    <h1 class="py-2 px-3 text-2xl">Home page</h1>
    <div class="">
      <h2>Name: {{ user.name }}</h2>
      <h2>Uuid: {{ user.uuId }}</h2>
    </div>
  </div>
  <hr />
  <div class="flex-col flex py-1 m-3 flex-wrap md:flex-row">
    <div class="flex px-2 items-center my-1">
      <p class="pr-2 text-lg">Room：</p>
      <input
        type="text"
        class="outline-none border rounded px-1 py-0.5 focus:border-gray-700 hover:border-gray-700"
        :value="inputReactive.roomName"
        @input="(e) => handleChangeRoomId(e)"
      />
    </div>
    <!-- <div class="flex px-2 items-center my-1">
      <p class="pr-2 text-lg">UID：</p>
      <input
        type="text"
        class="outline-none border rounded px-1 py-0.5 focus:border-gray-700 hover:border-gray-700"
        :value="inputReactive.uid"
        @input="(e) => handleChangeUID(e)"
      />
    </div> -->
    <button class="m-btn" @click="handleClickCreateRoom">CreateRoom</button>
    <button class="m-btn" @click="refreshRoomList">refreshRoomList</button>
  </div>
  <div>
    <ul class="flex flex-wrap">
      <li
        v-for="room in roomList"
        :key="room.roomId"
        class="h-44 w-60 bg-slate-300 rounded px-2 py-1 m-2 flex-grow cursor-pointer"
      >
        <p>Name:{{ room.roomName }}</p>
        <p>People:{{ room.roomUserSize }}</p>
        <button
          class="m-btn"
          @click="handleClickJoinRoom(room.roomId, room.roomName, true, false)"
        >
          Producer
        </button>
        <button
          class="m-btn"
          @click="handleClickJoinRoom(room.roomId, room.roomName, false, true)"
        >
          Consumer
        </button>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { useCommonStore } from "@/store/common";
import { getUuidByName, getRoomByUuId, createRoomByUuId } from "@/services/api";
import { getUserName } from "@/util/dummyName";
import {
  computed,
  defineComponent,
  onBeforeMount,
  onMounted,
  reactive,
  ref,
} from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
  name: "home",
  setup() {
    const commonStore = useCommonStore();
    // register store / router / .etc
    const router = useRouter();
    // Global Variable
    const inputReactive = reactive({
      roomName: "",
    });

    const user = reactive({
      name: "",
      uuId: "Permission denied",
    });

    onBeforeMount(async () => {
      try {
        user.name = getUserName();
        const uuidByNameResponse = (await getUuidByName(user.name)) as any;
        user.uuId = uuidByNameResponse.data;
        commonStore.getRoomList(user.uuId);
      } catch (e: any) {
        console.log(e);
      }
    });

    const refreshRoomList = () => {
      commonStore.refreshRoomList();
      commonStore.getRoomList(user.uuId);
    };

    onMounted(() => {});

    const handleChangeRoomId = (e: any) => {
      inputReactive.roomName = e.target.value;
    };

    const handleClickJoinRoom = (
      roomId: string,
      roomName: string,
      isProduce: boolean = true,
      isConsume: boolean = true
    ) => {
      router.push({
        path: "/room",
        query: {
          isProduce: isProduce,
          isConsume: isConsume,
          userName: user.name,
          uid: user.uuId,
          roomId: roomId,
          roomName: roomName,
        },
      });
    };
    const handleClickCreateRoom = () => {
      commonStore.createRoom(user.uuId, inputReactive.roomName);
    };
    return {
      inputReactive,
      roomList: computed(() => commonStore.roomList),
      user,
      handleChangeRoomId,
      handleClickCreateRoom,
      handleClickJoinRoom,
      refreshRoomList,
    };
  },
});
</script>

<style lang="scss" scoped>
.m-btn {
  @apply rounded px-2 py-1 m-2 border border-gray-600 hover:bg-gray-900 hover:text-white w-36;
}
</style>

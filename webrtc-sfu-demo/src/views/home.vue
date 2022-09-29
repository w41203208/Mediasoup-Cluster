<template>
  <div class="flex items-center">
    <h1 class="py-2 px-3 text-4xl">Home page</h1>
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
        :value="inputReactive.room"
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
    <button
      class="rounded px-2 py-1 m-2 border border-gray-600 hover:bg-gray-900 hover:text-white w-28"
      @click="handleClickCreateRoom"
    >
      CreateRoom
    </button>
    <button
      class="rounded px-2 py-1 m-2 border border-gray-600 hover:bg-gray-900 hover:text-white w-30"
      @click="getRoomList"
    >
      refreshRoomList
    </button>
    <!-- <button
      class="rounded px-2 py-1 m-2 border border-gray-600 hover:bg-gray-900 hover:text-white w-28"
      @click="handleClickJoinRoom"
    >
      JoinRoom
    </button> -->
  </div>
  <div>
    <ul class="flex flex-wrap">
      <li
        v-for="room in roomList"
        :key="room.roomId"
        class="h-44 w-60 bg-slate-300 rounded px-2 py-1 m-2 flex-grow cursor-pointer"
        @click="handleClickJoinRoom(room.roomId)"
      >
        {{ room.roomName }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { getUuidByName, getRoomByUuId } from "@/services/api";
import { getUserName } from "@/util/dummyName";
import { defineComponent, reactive, ref } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
  name: "home",
  setup() {
    // register store / router / .etc
    const router = useRouter();
    // Global Variable
    const inputReactive = reactive({
      room: "",
      // uid: "",
    });
    const roomList = ref();

    const user = reactive({
      name: "",
      uuId: "Permission denied",
    });

    user.name = getUserName();

    getUuidByName(user.name)
      .then((res: any) => {
        user.uuId = res.data;
        getRoomList();
      })
      .catch((err) => {
        console.log(err);
      });

    const getRoomList = () => {
      getRoomByUuId(user.uuId)
        .then((res: any) => {
          roomList.value = res.data;
        })
        .catch((err) => {
          console.log(err);
        });
    };
    const handleChangeRoomId = (e: any) => {
      inputReactive.room = e.target.value;
    };
    // const handleChangeUID = (e: any) => {
    //   inputReactive.uid = e.target.value;
    // };
    const handleClickJoinRoom = (room: string) => {
      router.push({
        path: "/room",
        query: {
          uid: user.uuId,
          room: room,
          role: "audience",
        },
      });
    };
    // const handleClickJoinRoom = (id: string) => {
    //   roomList.value.forEach((r) => {
    //     if (r.id === id) {
    //       inputReactive.room = r.id;
    //       inputReactive.uid = '';
    //     }
    //   });
    //   router.push({
    //     path: '/room',
    //     query: {
    //       uid: inputReactive.uid,
    //       room: inputReactive.room,
    //       role: 'audience',
    //     },
    //   });
    // };
    const handleClickCreateRoom = () => {
      router.push({
        path: "/room",
        query: {
          uid: user.uuId,
          room: inputReactive.room,
          role: "host",
        },
      });
    };
    return {
      inputReactive,
      roomList,
      user,
      handleChangeRoomId,
      handleClickCreateRoom,
      handleClickJoinRoom,
      getRoomList,
      // handleChangeUID,
    };
  },
});
</script>

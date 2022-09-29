<template>
  <div class="my-2 mx-3 py-1 px-2">
    <button class="m-btn" @click="handleClickEvtExit">Exit</button>
    <button class="m-btn" @click="handleClickEvtShare('video')">OpenVideo</button>
    <button class="m-btn">OpenAudio</button>
    <button class="m-btn">CloseVideo</button>
    <button class="m-btn">CloseAudio</button>
    <button class="m-btn" @click="handleClickEvtTest1">TEST1</button>
    <button class="m-btn" @click="handleClickEvtTest2">TEST2</button>
  </div>
  <div class="mx-3 p-5">
    <h1 class="text-lg font-semibold">Local Media</h1>
    <div id="localMeida" ref="localMediaRef"></div>
  </div>
  <div class="mx-3 p-5">
    <h1 class="text-lg font-semibold">Remote Media</h1>
    <div id="remoteMeida" ref="remoteMediaRef"></div>
  </div>
</template>

<script lang="ts">
import { RoomClient } from "@/services/roomClient";
import { defineComponent, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRouter, useRoute } from "vue-router";

export default defineComponent({
  name: "room",
  setup() {
    const router = useRouter();
    const route = useRoute();
    const roomInfoReactive = reactive({
      uid: route.query.uid!.toString(),
      room: route.query.room!.toString(),
      role: route.query.role!.toString(),
    });
    const rcRef = ref<RoomClient>(
      new RoomClient({
        clientUID: roomInfoReactive.uid,
        roomId: roomInfoReactive.room,
        clientRole: roomInfoReactive.role,
        isConsume: true,
        isProduce: true,
      })
    );
    const localMediaRef = ref<any>(null);
    const remoteMediaRef = ref<any>(null);

    const handleClickEvtShare = (type: string) => {
      rcRef.value.produce({ type: type, deviceId: null });
    };
    const handleClickEvtExit = () => {
      if (roomInfoReactive.role === "host") {
        rcRef.value.closeRoom(roomInfoReactive.room);
      } else {
        rcRef.value.leaveRoom(roomInfoReactive.room);
      }
      router.push("/");
    };

    const handleClickEvtTest1 = () => {
      rcRef.value.test1();
    };
    const handleClickEvtTest2 = () => {
      rcRef.value.test2();
    };

    onMounted(() => {
      const rc = rcRef.value;
      rc.localMediaContainer = localMediaRef.value;
      rc.remoteMediaContainer = remoteMediaRef.value;
      rc.socket.on("connecting", () => {
        if (roomInfoReactive.role === "host") {
          rc.createRoom(roomInfoReactive.room);
        } else {
          rc.joinRoom(roomInfoReactive.room);
        }
      });
    });
    onUnmounted(() => {
      const rc = rcRef.value;
      if (roomInfoReactive.role === "host") {
        rc.closeRoom(roomInfoReactive.room);
      } else {
        rc.leaveRoom(roomInfoReactive.room);
      }
    });

    return {
      localMediaRef,
      roomInfoReactive,
      remoteMediaRef,
      handleClickEvtShare,
      handleClickEvtExit,
      handleClickEvtTest1,
      handleClickEvtTest2,
    };
  },
});
</script>

<style lang="scss" scoped>
.m-btn {
  @apply rounded px-2 py-1 m-2 border border-gray-600 hover:bg-gray-900 hover:text-white;
}
</style>

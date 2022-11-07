<template>
  <div class="my-2 mx-3 py-1 px-2 text-lg">Room Name: {{ roomInfoReactive.roomName }}</div>
  <div class="my-2 mx-3 py-1 px-2 text-lg">My Name: {{ roomInfoReactive.userName }}</div>
  <div class="my-2 mx-3 py-1 px-2 text-lg">SFU Server: {{ sfuServer }}</div>
  <div class="my-2 mx-3 py-1 px-2">
    <button class="m-btn" @click="handleClickEvtExit">Exit</button>
    <button class="m-btn" @click="handleClickEvtShare('video')">Open Camera Video</button>
    <button class="m-btn" @click="handleClickEvtShare('audio')">Open Camera Audio</button>
    <!-- <button class="m-btn" @click="closeConsumer">CloseConsumer</button> -->
    <button class="m-btn" @click="handleClickEvtTest1">TEST1</button>
    <button class="m-btn" @click="handleClickEvtTest2">TEST2</button>
    <button class="m-btn" @click="TESTNET">TESTNET</button>
  </div>
  <div class="mx-3 p-5">
    <div class="flex items-center">
      <h1 class="text-lg font-semibold">Local Media</h1>
      <img
        v-if="mediaSending.cameraState"
        class="w-10 p-2 mx-1 cursor-pointer"
        @click="handleClickEvtToggleMediaSending('video')"
        :src="mediaSending.camera"
      />
      <img
        v-if="mediaSending.audioState"
        class="w-10 p-2 mx-1 cursor-pointer"
        @click="handleClickEvtToggleMediaSending('audio')"
        :src="mediaSending.audio"
      />
    </div>
    <div id="localMeida" ref="localMediaRef"></div>
  </div>
  <div class="mx-3 p-5">
    <div class="flex">
      <h1 class="text-lg font-semibold">Remote Media</h1>
      <select @change="setPreferredLayers" v-model="selectLayer">
        <option v-for="layer in layers" :value="layer.val">{{ layer.item }}</option>
      </select>
    </div>
    <div id="remoteMeida" ref="remoteMediaRef"></div>
  </div>
</template>

<script lang="ts">
import { RoomClient } from '@/services/roomClient';
import { defineComponent, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import videoPlayImg from '../assets/play-button.png';
import videoPauseImg from '../assets/pause.png';
import audioPlayImg from '../assets/audio-play.png';
import audioPauseImg from '../assets/audio-mute.png';

export default defineComponent({
  name: 'room',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const selectLayer = ref('3');
    const sfuServer = ref('');
    const mediaSending = ref({
      cameraState: false,
      camera: videoPlayImg,
      audioState: false,
      audio: audioPlayImg,
    });
    const layers = reactive([
      { val: '3', item: 'Select Resolution' },
      { val: '2', item: '720p' },
      { val: '1', item: '360p' },
      { val: '0', item: '180p' },
    ]);
    const roomInfoReactive = reactive({
      userName: route.query.userName!.toString(),
      uid: route.query.uid!.toString(),
      roomId: route.query.roomId!.toString(),
      roomName: route.query.roomName!.toString(),
      role: route.query.role!.toString(),
    });
    const rcRef = ref<RoomClient>(
      new RoomClient({
        clientUID: roomInfoReactive.uid,
        roomId: roomInfoReactive.roomId,
        roomName: roomInfoReactive.roomName,
        clientRole: roomInfoReactive.role,
        isConsume: true,
        isProduce: true,
      })
    );
    const localMediaRef = ref<any>(null);
    const remoteMediaRef = ref<any>(null);

    const handleClickEvtShare = (type: string) => {
      rcRef.value.produce({ type: type, deviceId: null });

      if (type == 'video') {
        mediaSending.value.cameraState = true;
      } else if (type == 'audio') {
        mediaSending.value.audioState = true;
      }
    };

    const handleClickEvtToggleMediaSending = (type: string) => {
      rcRef.value.toggleMediaSending({ type: type }).then((res) => {
        if (type == 'video') {
          if (res == true) {
            mediaSending.value.camera = videoPauseImg;
          } else if (res == false) {
            mediaSending.value.camera = videoPlayImg;
          }
        } else if (type == 'audio') {
          if (res == true) {
            mediaSending.value.audio = audioPauseImg;
          } else if (res == false) {
            mediaSending.value.audio = audioPlayImg;
          }
        }
      });
    };
    // const closeConsumer = () => {
    //   rcRef.value.closeConsumer();
    // };

    const setPreferredLayers = () => {
      if (selectLayer.value != '3') {
        rcRef.value.setPreferredLayers(parseInt(selectLayer.value));
      }
    };

    const handleClickEvtExit = () => {
      if (roomInfoReactive.role === 'host') {
        rcRef.value.closeRoom(roomInfoReactive.roomId);
      } else {
        rcRef.value.leaveRoom(roomInfoReactive.roomId);
      }
      router.push('/');
    };

    const handleClickEvtTest1 = () => {
      rcRef.value.test1();
    };
    const handleClickEvtTest2 = () => {
      rcRef.value.test2();
    };
    const TESTNET = () => {
      rcRef.value.testNet();
    };

    onMounted(() => {
      const rc = rcRef.value;
      rc.localMediaContainer = localMediaRef.value;
      rc.remoteMediaContainer = remoteMediaRef.value;
      rc.socket.on('connecting', () => {
        if (roomInfoReactive.role === 'host') {
          rc.createRoom(roomInfoReactive.uid, roomInfoReactive.roomName).then((res) => {
            // sfuServer.value = res;
          });
        } else {
          rc.joinRoom(roomInfoReactive.uid, roomInfoReactive.roomId).then((res) => {
            // sfuServer.value = res;
            // setTimeout(() => {
            //   rc.socket.close();
            // }, 10000);
          });
        }
      });
    });
    onUnmounted(() => {
      const rc = rcRef.value;
      if (roomInfoReactive.role === 'host') {
        rc.closeRoom(roomInfoReactive.roomId);
      } else {
        rc.leaveRoom(roomInfoReactive.roomId);
      }
    });

    return {
      localMediaRef,
      roomInfoReactive,
      remoteMediaRef,
      layers,
      selectLayer,
      sfuServer,
      mediaSending,
      handleClickEvtShare,
      handleClickEvtExit,
      handleClickEvtToggleMediaSending,
      handleClickEvtTest1,
      handleClickEvtTest2,
      TESTNET,
      setPreferredLayers,
    };
  },
});
</script>

<style lang="scss" scoped>
.m-btn {
  @apply rounded px-2 py-1 m-2 border border-gray-600 hover:bg-gray-900 hover:text-white;
}
</style>

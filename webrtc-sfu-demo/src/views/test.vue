<template>
  <div class="mb-2">
    <div class="mb-1">
      <p class="text-lg">RoomInfo:</p>
      <p class="text-md">RoomName:</p>
      <input
        type="text"
        class="outline-none border rounded px-1 py-0.5 focus:border-gray-700 hover:border-gray-700"
        :value="inputRoomInfoReactive.roomName"
        @input="(e) => handleChangeRoomName(e)"
      />
      <p class="text-md">RoomId:</p>
      <input
        type="text"
        class="outline-none border rounded px-1 py-0.5 focus:border-gray-700 hover:border-gray-700"
        :value="inputRoomInfoReactive.roomId"
        @input="(e) => handleChangeRoomId(e)"
      />
    </div>
    <div class="mb-1">
      <p class="text-lg">Range:</p>
      <p class="text-md">Min:</p>
      <input
        type="text"
        class="outline-none border rounded px-1 py-0.5 focus:border-gray-700 hover:border-gray-700"
        :value="inputRangeReactive.rangeMin"
        @input="(e) => handleChangeRangeMin(e)"
      />
      <p class="text-md">Max:</p>
      <input
        type="text"
        class="outline-none border rounded px-1 py-0.5 focus:border-gray-700 hover:border-gray-700"
        :value="inputRangeReactive.rangeMax"
        @input="(e) => handleChangeRangeMax(e)"
      />
    </div>
    <div class="mb-1">
      <p class="text-lg">Role:</p>
      <input
        type="checkbox"
        value="consumer"
        id="consumer"
        :checked="inputRole.hasC"
        @change="handleChangeHasConsumer(!inputRole.hasC)"
      />
      <label for="consumer">Consumer</label>
      <input
        type="checkbox"
        value="producer"
        id="producer"
        :checked="inputRole.hasP"
        @change="handleChangeHasProducer(!inputRole.hasP)"
      />
      <label for="producer">Producer</label>
    </div>
  </div>
  <div class="mb-2">
    <p class="text-lg">File:</p>
    <input v-show="false" id="fileInput" type="file" />
    <button class="m-btn" @click="handleClickSelectFile">Select File</button>
  </div>
  <div class="mb-2">
    <p class="text-lg">Test</p>
    <button class="m-btn" @click="handleClickTest">Start Test</button>
  </div>
</template>

<script lang="ts">
import nameTxt from "../assets/file/name.txt";
import { RoomClient } from "@/services/roomClient";
import { defineComponent, onMounted, onUnmounted, reactive, ref } from "vue";

interface TestClient {
  isProduce: boolean;
  isConsume: boolean;
  uid: string;
  roomId: string;
  roomName: string;
}

export default defineComponent({
  name: "test",
  setup() {
    const inputRoomInfoReactive = reactive({
      roomName: "test1",
      roomId: "test1-1669010629715",
    });

    const inputRangeReactive = reactive({
      rangeMin: 0,
      rangeMax: 50,
    });

    const inputRole = reactive({
      hasP: true,
      hasC: true,
    });
    const produceClientRef = ref<RoomClient>();
    const consumeClientRef = ref<Array<RoomClient>>([]);
    const testClientInfoReactive = reactive<Array<TestClient>>([]);
    const handleClickSelectFile = () => {
      const input = document.querySelector("#fileInput") as HTMLInputElement;
      input.click();
      input.onchange = () => {
        const input = document.querySelector("#fileInput") as any;
        const reader = new FileReader();

        reader.onload = (evt: any) => {
          const nameTxts = evt.target.result.split("\n");
          if (inputRole.hasP) {
            testClientInfoReactive.push({
              isProduce: true,
              isConsume: false,
              uid: nameTxts[inputRangeReactive.rangeMin],
              roomId: inputRoomInfoReactive.roomId,
              roomName: inputRoomInfoReactive.roomName,
            });
          } else {
            testClientInfoReactive.push({
              isProduce: false,
              isConsume: true,
              uid: nameTxts[inputRangeReactive.rangeMin],
              roomId: inputRoomInfoReactive.roomId,
              roomName: inputRoomInfoReactive.roomName,
            });
          }
          console.log(inputRangeReactive.rangeMin, inputRangeReactive.rangeMax);

          for (
            let i = inputRangeReactive.rangeMin + 1;
            i < inputRangeReactive.rangeMax;
            i++
          ) {
            testClientInfoReactive.push({
              isProduce: false,
              isConsume: true,
              uid: nameTxts[i],
              roomId: inputRoomInfoReactive.roomId,
              roomName: inputRoomInfoReactive.roomName,
            });
          }
          console.log(testClientInfoReactive);
        };

        reader.readAsText(input.files[0]);
      };
    };
    const handleClickTest = () => {
      testClientInfoReactive.forEach((c: TestClient) => {
        if (c.isProduce) {
          produceClientRef.value = new RoomClient({
            clientUID: c.uid,
            roomId: c.roomId,
            roomName: c.roomName,
            isConsume: c.isConsume,
            isProduce: c.isProduce,
          });
        } else {
          consumeClientRef.value.push(
            new RoomClient({
              clientUID: c.uid,
              roomId: c.roomId,
              roomName: c.roomName,
              isConsume: c.isConsume,
              isProduce: c.isProduce,
            })
          );
        }
      });
    };

    const handleChangeRangeMin = (e: any) => {
      inputRangeReactive.rangeMin = parseInt(e.target.value);
    };
    const handleChangeRangeMax = (e: any) => {
      inputRangeReactive.rangeMax = parseInt(e.target.value);
    };
    const handleChangeRoomName = (e: any) => {
      inputRoomInfoReactive.roomName = e.target.value;
    };

    const handleChangeRoomId = (e: any) => {
      inputRoomInfoReactive.roomId = e.target.value;
    };

    const handleChangeHasConsumer = (has: boolean) => {
      inputRole.hasC = has;
      console.log(inputRole.hasC);
    };

    const handleChangeHasProducer = (has: boolean) => {
      inputRole.hasP = has;
      console.log(inputRole.hasP);
    };

    onUnmounted(() => {
      produceClientRef.value?.leaveRoom(inputRoomInfoReactive.roomId);
      const rcArray = consumeClientRef.value;
      rcArray.forEach((c: any) => {
        c.leaveRoom(inputRoomInfoReactive.roomId);
      });
    });

    return {
      inputRoomInfoReactive,
      handleClickSelectFile,
      handleClickTest,
      inputRangeReactive,
      handleChangeRangeMin,
      handleChangeRangeMax,
      handleChangeRoomName,
      handleChangeRoomId,
      handleChangeHasProducer,
      handleChangeHasConsumer,
      inputRole,
    };
  },
});
</script>

<style lang="scss" scoped>
.m-btn {
  @apply rounded px-2 py-1 m-2 border border-gray-600 hover:bg-gray-900 hover:text-white w-36;
}
</style>

<template>
  <h1>Room page</h1>
</template>

<script lang="ts">
import { RoomClient } from '@/services/roomClient';
import { defineComponent, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';

export default defineComponent({
  name: 'room',
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
      })
    );

    onMounted(() => {
      const rc = rcRef.value;
      rc.socket.on('connecting', () => {
        if (roomInfoReactive.role === 'host') {
          rc.createRoom(roomInfoReactive.room);
        } else {
          console.log('audience');
        }
      });
    });
    onUnmounted(() => {
      const rc = rcRef.value;
      rc.closeRoom(roomInfoReactive.room);
    });

    return {
      roomInfoReactive,
    };
  },
});
</script>

import {} from 'mediasoup-client';
import { Socket } from '@/services/websocket';

interface RoomClientOpeions {
  clientUID: string;
  roomId: string;
  clientRole: string;
}

export class RoomClient {
  private _clientUID: string;
  private _clientRole: string;
  private _roomId: string;
  private _socket: Socket;

  constructor({ clientUID, roomId, clientRole }: RoomClientOpeions) {
    this._clientUID = clientUID;
    this._clientRole = clientRole;
    this._roomId = roomId;
    this._socket = this._createSocketConnection();
  }

  get socket() {
    return this._socket;
  }

  private _createSocketConnection(): Socket {
    const url = 'wss://localhost:9999';
    const socket = new Socket({ url });
    socket.on('Message', (msg: any) => {
      const { type, data } = msg;
      this._messageHandle({ type, data });
    });
    socket.start();
    return socket;
  }

  _messageHandle({ type, data }: { type: string; data: any }) {}

  // host
  createRoom(roomId: string) {
    this._socket.sendData({ data: { room_id: roomId }, type: 'createRoom' });
    this.joinRoom(roomId);
  }
  closeRoom(roomId: string) {
    this._socket.sendData({ data: { room_id: roomId }, type: 'closeRoom' });
    this._socket.close();
  }

  // audience
  joinRoom(roomId: string) {
    this._socket.sendData({ data: { room_id: roomId }, type: 'joinRoom' });
  }
  leaveRoom() {}
}

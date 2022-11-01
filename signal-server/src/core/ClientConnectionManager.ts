import { Peer } from './Peer';

export class ClientConnectionManager {
  private _peerMap: Map<string, Peer>;
  constructor() {
    this._peerMap = new Map();
  }
  setPeer(peer: Peer) {
    this._peerMap.set(peer.id, peer);
  }

  getPeer(id: string) {
    return this._peerMap.get(id);
  }

  delPeer(id: string) {
    return this._peerMap.delete(id);
  }
}

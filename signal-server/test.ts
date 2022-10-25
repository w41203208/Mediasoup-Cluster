// import { v4 } from 'uuid';

// // const enc = new TextEncoder();
// // const v = v4();
// // console.log(v);
// // const test = enc.encode(v);

// // const buffer_5 = new ArrayBuffer(72);
// // const view_5 = new Uint16Array(buffer_5);
// // view_5.forEach((v, index) => {
// //   view_5[index] = test[index];
// // });
// // const dec = new TextDecoder();
// // console.log(dec.decode(view_5));

// const enc = new TextEncoder();
// const obj = {
//   test: 'test',
//   test2: 'test2',
// };
// const jObj = JSON.stringify(obj);
// const enObj = enc.encode(jObj);
// console.log(enObj);

// // const tempBuffer = Buffer.from(jobj);

// // console.log(tempBuffer);

// const buffer = new ArrayBuffer(72);
// const view = new Uint8Array(buffer);
// view.forEach((v, index) => {
//   view[index] = enObj[index];
// });

// console.log(view);
// const new_view = view.subarray(0, 31);
// console.log(new_view);
// const dec = new TextDecoder();
// const deObj = dec.decode(new_view);
// const jjObj = JSON.parse(deObj);
// console.log(jjObj);
// // console.log(JSON.parse(tempBuffer.toString()));

// // const memory = initBuffer(1024);

// // heap.ts
// export const typedArraysPropNameToCtorMap = {
//   u8: Uint8Array,
// } as const;

// export type TypedArrayPropNameToCtorType = typeof typedArraysPropNameToCtorMap;

// export type Heap = {
//   [x in keyof TypedArrayPropNameToCtorType]: InstanceType<TypedArrayPropNameToCtorType[x]>;
// };

// // 目前只能看到 8 bits heap
// function createHeap(buffer: SharedArrayBuffer | ArrayBuffer): Heap {
//   const r = {} as any;
//   Object.entries(typedArraysPropNameToCtorMap).forEach(([name, Ctor]) => {
//     r[name] = new Ctor(buffer);
//   });

//   return r;
// }

// // allocator.ts
// interface AllocatorInitOpts {
//   size: number;
// }

// interface AllocatorState extends Heap {
//   options: AllocatorInitOpts;
// }

// class Allocator {
//   private _allocatorState: AllocatorState;
//   constructor(options: AllocatorInitOpts) {
//     this._allocatorState = this.allocatorInit({
//       size: options.size,
//     });
//   }
//   allocatorInit(options: AllocatorInitOpts) {
//     const buffer = new SharedArrayBuffer(options.size);
//     return {
//       options,
//       ...createHeap(buffer),
//     };
//   }

//   // useBuffer(buffer: SharedArrayBuffer, value: Record<string, any>) {
//   //   let view = new Uint8Array(buffer);
//   //   const viewValue = this.transformToByteArray(value);
//   //   if (view.length < viewValue.length) {
//   //     const new_buffer = this.recallocBuffer(buffer);
//   //   }
//   // }

//   recalloc(buffer: SharedArrayBuffer) {}

//   getHeap() {
//     return this._allocatorState;
//   }
// }

// // Carrier.ts
// interface Carrier {
//   allocator: Allocator;
//   buffer: SharedArrayBuffer | ArrayBuffer;
//   heap: Heap;
// }

// class Carrier {
//   private _allocator: Allocator;
//   private _heap: Heap;
//   private _buffer: SharedArrayBuffer | ArrayBuffer;
//   constructor({ allocator, buffer, heap }: Carrier) {
//     this._allocator = allocator;
//     this._buffer = buffer;
//     this._heap = heap;
//   }

//   recallocBuffer() {
//     this._allocator.recalloc(this._buffer);
//   }
// }

// // objectWrapper.ts
// function createObjectBuffer(value: any, size: number) {
//   const allocator = new Allocator({
//     size: size,
//   });
//   const carrier: Carrier = {
//     allocator: allocator,
//     heap: allocator.getHeap(),
//   };
//   const objWrapper = new ObjectWrapper(carrier, value);
// }

// class ObjectWrapper {
//   private _carrier: Carrier;
//   constructor(carrier: Carrier, value: any) {
//     this._carrier = carrier;
//     this.initObjectWrapper(value);
//   }
//   initObjectWrapper(value: any) {
//     const valueView = this.transformToByteArray(value);

//     if (valueView.length < this._carrier.heap.u8.length) {
//       this._carrier.recallocBuffer();
//     }
//   }

//   transformToByteArray(obj: Record<string, any>): Uint8Array {
//     const enc = new TextEncoder();
//     const jObj = JSON.stringify(obj);
//     const enObj = enc.encode(jObj);

//     return enObj;
//   }
// }
function testerr() {
  throw new Error('testerr');
}
function testtest(err: number) {
  if (err === 1) {
    testerr();
  } else {
    throw new Error('testtest');
  }
}

function test() {
  try {
    testtest(2);
  } catch (e: any) {
    console.log(e.message);
  }
}

test();

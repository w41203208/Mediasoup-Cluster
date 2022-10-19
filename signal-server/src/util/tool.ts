function stringToArray8(str: string): Uint8Array {
  const enc = new TextEncoder();
  const transformString = enc.encode(str);

  const buffer = new ArrayBuffer(str.length);
  const view = new Uint8Array(buffer);

  view.forEach((v, index) => {
    view[index] = transformString[index];
  });

  return view;
}

type FunctionExcute = ([key, value]: [key: string, value: any]) => {};

export const test = (obj: any, excute: FunctionExcute) => {
  Object.entries(obj).forEach(excute);
  return function () {
    return;
  };
};

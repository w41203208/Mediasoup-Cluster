export class ControllerImp {
  constructor() {}
  transformToJSON(data: any) {
    return JSON.stringify(data);
  }
  transformToJS(data: any) {
    return JSON.parse(data);
  }
}

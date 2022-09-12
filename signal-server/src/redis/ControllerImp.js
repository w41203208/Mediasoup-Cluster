class ControllerImp {
  constructor() {}
  transformToJSON(data) {
    return JSON.stringify(data);
  }
  transformToJS(data) {
    return JSON.parse(data);
  }
}

module.exports = {
  ControllerImp: ControllerImp,
};

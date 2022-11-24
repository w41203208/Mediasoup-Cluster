export class Pass {
  private passBatch: Map<string, PassCard[]>;
  constructor() {
    this.passBatch = new Map();
  }
  addInPassBatch(pc: PassCard) {
    if (this.passBatch.has(pc.id)) {
      const cards = this.passBatch.get(pc.id)!;
      cards.push(pc);
    } else {
      this.passBatch.set(pc.id, [pc]);
    }
  }
  hasPassBatch(id: string) {
    return this.passBatch.has(id);
  }

  pass(id: string) {
    const psArray = this.passBatch.get(id)!;
    psArray.forEach((ps: PassCard) => {
      ps.func().then(() => {
        ps.rrObj.resolve();
      });
    });
  }
}

export class PassCard {
  private _id: string;
  private _func: Function;
  private _rrObj: any;
  constructor(id: string, func: Function, rrObj: any) {
    this._id = id;
    this._func = func;
    this._rrObj = rrObj;
  }
  get id() {
    return this._id;
  }
  get func() {
    return this._func;
  }

  get rrObj() {
    return this._rrObj;
  }
}

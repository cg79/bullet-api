class Operator {
  constructor(t) {
    this.sign = t;
    this.value = 0;
  }

  // o: Operator
  lessOrEqualInPrecedenceTo(o) {
    return this.value <= o.value;
  }
}

module.exports = Operator;

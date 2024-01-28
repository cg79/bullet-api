const Operator = require('./operator');

class Divide extends Operator {
  constructor(t) {
    super(t);
    this.value = 0;
  }

  applyFunction(arg1, arg2) {
    return arg1 / arg2;
  }
}

module.exports = Divide;

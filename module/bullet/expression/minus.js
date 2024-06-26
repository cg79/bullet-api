const Operator = require('./operator');

class Minus extends Operator {
  constructor(t) {
    super(t);
    this.value = 0;
  }

  applyFunction(arg1, arg2) {
    return arg1 - arg2;
  }
}

module.exports = Minus;


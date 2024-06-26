const Operator = require('./operator');

class Plus extends Operator {
  constructor(t) {
    super(t);
    this.value = 0;
  }

  applyFunction(arg1, arg2) {
    return arg1 + arg2;
  }
}

module.exports = Plus;

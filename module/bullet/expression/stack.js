class Stack {
  constructor() {
    this.stack = [];
  }

  isEmpty() {
    return this.stack.length === 0;
  }

  pop() {
    return this.stack.pop();
  }

  peek() {
    return this.stack[this.stack.length - 1];
  }

  push(o) {
    this.stack.push(o);
  }

  size() {
    return this.stack.length;
  }
}

module.exports = Stack;

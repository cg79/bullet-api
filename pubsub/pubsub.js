class PubSub {
  handlers = {};

  subscribe(eventName, func) {
    let handlerMap = this.handlers[eventName];
    if (!handlerMap) {
      this.handlers[eventName] = [];
      handlerMap = this.handlers[eventName];
    }

    handlerMap.push(func);
  }

  unSubscribe(eventName, instance) {
    const handlerMap = this.handlers[eventName];
    if (!handlerMap) {
      return;
    }
    handlerMap.delete(instance);
  }

  publish(eventName, data = null) {
    const handlerMap = this.handlers[eventName];
    if (!handlerMap) {
      return;
    }
    handlerMap.forEach((funcValue) => {
      funcValue(data);
    });
  }
  async publishOnce(eventName, data = null) {
    const handlerMap = this.handlers[eventName];
    if (!handlerMap) {
      return;
    }
    const funcValue = handlerMap[0];
    const response = await funcValue(data);
    return response;
  }
}

const instance = new PubSub();
module.exports = instance;

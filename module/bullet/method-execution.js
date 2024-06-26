const moduleFactory = require("../module-factory/module-factory");
const pubSub = require("../../pubsub/pubsub");
class MethodExecution {
  constructor() {
    pubSub.subscribe("executeMethodFromModule", this.executeMethodFromModule);
  }
  executeMethodFromModule = async (bodyTokenAndBulletConnection) => {
    debugger;
    const { moduleName, method, body } = bodyTokenAndBulletConnection;
    // const { module: moduleName, method, body } = deltaFunction;
    const moduleInst = moduleFactory.getModuleByName(moduleName);
    if (!moduleInst) {
      throw new Error(`module ${moduleName} not found`);
    }

    // const obj = body.useBody ? body : request;

    const methodResponse = await moduleInst[method](
      bodyTokenAndBulletConnection
    );
    return methodResponse || {};
  };
}

module.exports = new MethodExecution();

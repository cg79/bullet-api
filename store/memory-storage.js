const Store = require("./store");
class MemoryStorage extends Store {}

module.exports = new MemoryStorage();

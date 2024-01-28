const dateMethods = require("./for-date/date-methods");
class BodyPropsMethods {
  execute(path, bodyProp) {
    return dateMethods.execute(path, bodyProp);
  }
}

module.exports = new BodyPropsMethods();

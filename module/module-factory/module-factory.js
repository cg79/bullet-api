const pdfParser = require("../pdf/pdf-parser");
const bullet = require("../bullet/bulletService");
const accounting = require("../accounting/accounting");
const management = require("../management/management");
const email = require("../email/emailMethods");
const user = require("../user/user-service");

class ModuleFactory {
  modules = {};
  getModuleByName(name) {
    // return this.modules[name];
    switch (name) {
      case "email": {
        return email;
      }
      case "bullet": {
        return bullet;
      }
      case "accounting": {
        return accounting;
      }
      case "user": {
        return user;
      }
      case "management": {
        return management;
      }
      case "security": {
        return require("./security/security-service");
      }
      case "pdfParser": {
        return pdfParser;
      }
      default: {
        throw new Error(`module ${name} was not found`);
      }
    }
  }
}

module.exports = new ModuleFactory();

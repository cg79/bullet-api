// const safeEval = require('safe-eval')

// const Sandbox = require("sandbox");
const Logger = require("../../logger/logger");
const { NodeVM, VM, VMScript } = require("vm2");

// const moduleFactory = require('../../routes/moduleFactory');
// const Promise = require('promise');

//LINK: https://developpaper.com/how-to-safely-execute-user-defined-nodejs-scripts/

class Code {
  executeFunction = (functiontext, hasBrackets, parameter) => {
    try {
      // let fn = null;
      // if (hasBrackets) {
      //   fn = this.createFunctionFromString(functiontext);
      // } else {
      //   fn = this.parseFunction(functiontext);
      // }
      // const response = {};
      // response.compiledFunction = fn;
      // response.result = fn(parameter);
      // return response;

      debugger;

      const vm = new NodeVM({
        timeout: 1000,
        require: {
          external: true,
          root: "./",
        },
      });

      var vmFunction = vm.run(
        `
      module.exports =  ${functiontext}
    `,
        "vm.js"
      );

      const response = vmFunction(parameter);
      // console.log(response);
      return { response };
    } catch (ex) {
      return {
        deltaException: ex.message || ex,
      };
    }
  };

  execute = (code) => {
    // const deferred = q.defer();
    // const s = new Sandbox();
    // s.run(code, (output) => {
    //   Logger.log(output);
    //   deferred.resolve(output);
    // });
    // return deferred.promise;
  };

  // https://stackoverflow.com/questions/584907/javascript-better-way-to-add-dynamic-methods
  executefunc = (code) => {
    try {
      const fn = new Function(code);
      return fn();
    } catch (ex) {
      throw new Error(ex);
    }
  };

  compileFunc = (code) => {
    try {
      const fn = new Function(code);
      return fn;
    } catch (ex) {
      throw new Error(ex);
    }
  };

  metods = async (body) => {
    // const { body } = ctx.request;
    Logger.log("body");
    Logger.log(body);
    const { data } = body;
    const { method } = body.proxy;
    const module = moduleFactory.getModule(body.proxy.module);
    Logger.log(module);

    const prototype = Object.getPrototypeOf(module);
    const functions = Object.getOwnPropertyNames(prototype).filter(
      (property) => typeof module[property] === "function"
    );
    if (!data.includefunctionbody) {
      return functions;
    }

    const fbody = {};
    functions.forEach((f) => {
      fbody[f] = module[f].toString();
    });

    return fbody;
  };

  methodname = async (body) => {
    // const { body } = ctx.request;
    Logger.log("body");
    Logger.log(body);
    const { data } = body;
    const { methodname } = data;
    const { method } = body.proxy;
    const module = moduleFactory.getModule(body.proxy.module);
    Logger.log(module);

    const prototype = Object.getPrototypeOf(module);
    const functions = Object.getOwnPropertyNames(prototype).filter(
      (property) => property === methodname
    );

    const fbody = {};
    functions.forEach((f) => {
      fbody[f] = module[f].toString();
    });

    return fbody;
  };

  addmethod = (data) => {
    // const { body } = ctx.request;
    // Logger.log('body');
    Logger.log(data);
    // const { data } = body;
    const { formodule, methodname, implementation, saveondisk } = data;

    const module = moduleFactory.getModule(formodule);
    Logger.log(module);

    this.executefunc(implementation);
    module[methodname] = this.compileFunc(implementation);

    if (saveondisk) {
      const { filename } = data;
      if (filename) {
        const prototype = Object.getPrototypeOf(module);
        const functions = Object.getOwnPropertyNames(prototype).filter(
          (property) => typeof module[property] === "function"
        );
        let filecontent = "";

        functions.forEach((f) => {
          filecontent += `
            ${module[f].toString()}
          `;
        });
        fs.writeFileSync(filename, filecontent);
      }
    }
    return 200;
    // {
    //   "data":{
    //     "methodname": "insert111",
    //     formodule: 'code',
    //     "implementation": "function test(d){console.log('sssssssss'); return d} return test(88)"
    //   },
    //     "proxy": {
    //       "module": "code",
    //       "method": "addmethod",

    //     }

    //   }
  };

  registerMethod = async (module) => {
    // const { body } = ctx.request;
    // Logger.log('body');
    // Logger.log(data);
    // const { data } = body;
    const { name, textfunction } = module;

    this.executefunc(textfunction);

    const moduleInst = moduleFactory.getModule(module);
    moduleInst[name] = this.compileFunc(textfunction);

    if (saveondisk) {
      const { filename } = data;
      if (filename) {
        const prototype = Object.getPrototypeOf(moduleInst);
        const functions = Object.getOwnPropertyNames(prototype).filter(
          (property) => typeof moduleInst[property] === "function"
        );
        let filecontent = "";

        functions.forEach((f) => {
          filecontent += `
            ${moduleInst[f].toString()}
          `;
        });
        fs.writeFileSync(filename, filecontent);
      }
    }
    return 200;
    // {
    //   "data":{
    //     "methodname": "insert111",
    //     formodule: 'code',
    //     "implementation": "function test(d){console.log('sssssssss'); return d} return test(88)"
    //   },
    //     "proxy": {
    //       "module": "code",
    //       "method": "addmethod",

    //     }

    //   }
  };

  parse = (s) => {
    const re = /(\{)(.*?)(\})/g;
    const resp = s.replace(re, (x, $1, $2, $3) => `el.${$2}`);
    return resp;
  };

  createFunctionFromString = (s) => {
    const expression = this.parse(s);
    const body = `el => ${expression}`;
    return new Function(body);
  };

  parseFunction0 = (text) => {
    //     const ftext = `
    //   function test(input){
    //     return input.age +9;
    //   }
    // `;
    const func = new Function("return " + text)();
    return func;
  };

  parseFunction1 = (text) => {
    const func = new Function(text);
    // console.log(func.toString());
    return func;
  };

  parseFunction = (text) => {
    text = text + " ";
    text = text.replace(/\n/g, " ");

    var funcReg = /{.*?}/gim;
    // var match = funcReg.exec(text);
    var match = text.match(/{(.*?)}/);
    // if (!match) {
    //   match = text.match(/{(.*?)}/);
    // }
    if (match) {
      return new Function("input", match[1]);
    }
    return null;
  };

  executeCompiledFunction = (compiledFunction, params) => {
    try {
      const response = compiledFunction(params);
      return response;
    } catch (ex) {
      throw new Error(ex);
    }
  };

  executeDeltaFunction = (deltafunction, params) => {
    let objParams = params;
    // if (params) {
    //   try {
    //     objParams = JSON.parse(params);
    //   } catch (ex) {
    //     //todo
    //   }
    // }
    const { functiontext, compiledFunction, hasBrackets } = deltafunction;
    let response = null;
    if (compiledFunction) {
      response = this.executeCompiledFunction(compiledFunction, objParams);
      return response;
    } else {
      response = this.executeFunction(functiontext, hasBrackets, objParams);
      // deltafunction.compiledFunction = response.compiledFunction;
      if (response.deltaException) {
        return response;
      }
      return response.response;
      // if (response.response) {
      //
      // }
      // return response.exception;
    }
  };
}
module.exports = new Code();

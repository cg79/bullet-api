

class Logger {
  constructor() {
    this.enabled = true;
    // ['log', 'warn', 'error'].forEach((method) => {
    //   const oldMethod = console[method].bind(console);
    //   console[method] = function () {
    //     oldMethod.apply(
    //       console,
    //       [mapping[method](new Date().toISOString())]
    //         .concat(arguments),
    //     );
    //   };
    // });


    ['warn', 'error'].forEach((method) => {
      const oldMethod = console[method].bind(console);
      console[method] = function () {
        // var ar = [new Date().toISOString(), ...Object.values(arguments)];
        oldMethod(
          ...[new Date().toISOString(), ...Object.values(arguments)],
        );
      };
    });
  }

  log() {
    if (!this.enabled) {
      return;
    }
    console.log(...arguments);
  }

  warn() {
    if (!this.enabled) {
      return;
    }
    console.warn(...arguments);
  }

  error() {
    if (!this.enabled) {
      return;
    }
    console.error(...['%c', ...arguments, 'background: #222; color: #bada55']);
  }
}

module.exports = new Logger();

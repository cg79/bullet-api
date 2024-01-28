/* eslint-disable no-plusplus */
// http://stackoverflow.com/questions/25353444/outputting-human-readable-times-from-timestamps-on-blockchain-name

class Utils {
  guid() {
    function _p8(s) {
      var p = (Math.random().toString(16) + "000000000").substr(2, 8);
      return s ? p.substr(0, 4) + p.substr(4, 4) : p;
    }
    return _p8() + _p8(true) + _p8(true) + _p8();
  }

  combine2Strings(s1, s2) {
    if (s1 < s2) {
      [s1, s2] = [s2, s1];
    }
    const l1 = s1.length;
    const l2 = s2.length;
    let i = 0;
    const result = [];
    const max = l1 > l2 ? l1 : l2;

    while (i < max) {
      if (i < l1) {
        result.push(s1[i]);
      }
      if (i < l2) {
        result.push(s2[i]);
      }
      i++;
    }
    return result.join("");
  }

  createNestedObject(source, path) {
    const paths = path.split(".");
    const last = paths.pop();
    if (paths.length === 0) {
      return {
        source,
        ref: source,
        last,
      };
    }
    let ref = source;
    for (let i = 0; i < paths.length; i++) {
      const p = paths[i];
      if (!ref[p]) {
        ref[p] = {};
        ref = ref[p];
      } else {
        ref = ref[p];
      }
    }

    return {
      source,
      ref,
      last,
    };
  }

  readObjectValueByPath(source, path) {
    const paths = path.split(".");
    if (paths.length === 1) {
      return source[path];
    }
    let ref = source;

    for (let i = 0; i < paths.length; i++) {
      const p = paths[i];
      ref = ref[p];
    }

    return ref;
  }

  copyFrom(source, fields = [], destination = {}) {
    // fields = array od {from , to}

    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const { from } = f;
      const to = f.to ? f.to : f.from;

      const fromValue = this.readObjectValueByPath(source, from);
      let nested = null;

      if (fromValue) {
        const toType = typeof to;

        // eslint-disable-next-line default-case
        switch (toType) {
          case "string": {
            nested = this.createNestedObject(destination, to);
            const { ref, last } = nested;
            ref[last] = fromValue;
            break;
          }
          case "object": {
            const isArray = Array.isArray(to);
            const { name, fields1 } = to;

            if (!isArray) {
              // expects an oject with name and fields properties
              if (!to) {
                // eslint-disable-next-line no-throw-literal
                throw "When to is an object , is expected to habe name and fields properties";
              }

              nested = this.createNestedObject(destination, name);
              const { ref, last } = nested;
              if (Array.isArray(fromValue)) {
                ref[last] = [];
                fromValue.forEach((el) => {
                  const newV = this.copyFrom(el, fields1, {});
                  ref[last].push(newV);
                });
              } else {
                //
                // eslint-disable-next-line no-lonely-if
                if (!fields1) {
                  ref[last] = fromValue;
                } else {
                  ref[last] = this.copyFrom(fromValue, fields1, {});
                }
              }
            } else {
              nested = this.createNestedObject(destination, from);
              // if (!fields) { throw 'no fields property provided for ', to };
              const { ref, last } = nested;
              if (Array.isArray(fromValue)) {
                ref[last] = [];
                fromValue.forEach((el) => {
                  const newV = this.copyFrom(el, to, {});
                  ref[last].push(newV);
                });
              }
            }

            break;
          }
        }
      }
    }
    return destination;
  }

  // var source = {
  //   a: 5,
  //   b: [{ c: 1, d: 5 }, { c: 2, d: 6 }],
  //   address: {
  //     location: {
  //       street: 'street value'
  //     },
  //     geo: {
  //       lat: 15,
  //       lng: 78
  //     }
  //   }
  // };
  // copyFrom(source, [{from: 'a', to: 'bbbb'}])

  // copyFrom(source, [{from: 'a', to: 'bbbb.a'}])

  // copyFrom(source, [
  //   { from: 'a', to: 'x' },
  //   { from: 'a', to: 'aa.a' },
  //   { from: 'b', to: 'b1' },
  //   { from: 'b', to: 'bb.b' },
  //   {
  //     from: 'b', to: [
  //       {
  //         from: 'c',
  //         to: 'c1'
  //       }
  //     ]
  //   },
  //   {
  //     from: 'b', to:
  //     {
  //       name: 'newb',
  //       fields: [{ from: 'c', to: 'c1' }, {from: 'd', to: 'd1' }]
  //     }
  //   },
  //   {
  //     from: 'b', to:
  //     {
  //       name: 'ne.wb',
  //       fields: [{ from: 'c', to: 'c1' }, {from: 'd', to: 'd1' }]
  //     }
  //   },
  //   {from: 'address.location', to: 'location1'},
  //   {from: 'address', to: {
  //     name: "address1"
  //   }},
  //   {from: 'address', to: {
  //     name: "address2",
  //     fields: [{
  //       from : 'location',
  //       to: 'location1'
  //     },{
  //       from: 'geo',
  //       to: "geo1"
  //     }]
  //   }},
  //   {from: 'address', to: {
  //     name: "address3",
  //     fields: [{
  //       from : 'location',
  //       to: 'location1'
  //     },{
  //       from: 'geo',
  //       to: {
  //         name: 'geo2'
  //       }
  //     }]
  //   }},
  //   {from: 'address', to: {
  //     name: "address4",
  //     fields: [{
  //       from : 'location',
  //       to: 'location1'
  //     },{
  //       from: 'geo',
  //       to: {
  //         name: 'geo2',
  //         fields: [{
  //           from: 'lat',
  //           to: 'lat111'
  //         }]
  //       }
  //     }]
  //   }},
  //   {from: 'address', to: {
  //     name: "address5",
  //     fields: [{
  //       from : 'location',
  //       to: 'location1'
  //     },{
  //       from: 'geo',
  //       to: {
  //         name: 'geo2',
  //         fields: [{
  //           from: 'lat'
  //         }]
  //       }
  //     }]
  //   }}
  // ]);
}

module.exports = new Utils();

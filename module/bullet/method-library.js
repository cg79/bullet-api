const cryptoJS = require("node-cryptojs-aes").CryptoJS;

class MethodLibrary {
  guid = () => {
    const lut = this.lut;
    var d0 = (Math.random() * 0xffffffff) | 0;
    var d1 = (Math.random() * 0xffffffff) | 0;
    var d2 = (Math.random() * 0xffffffff) | 0;
    var d3 = (Math.random() * 0xffffffff) | 0;
    return (
      lut[d0 & 0xff] +
      lut[(d0 >> 8) & 0xff] +
      lut[(d0 >> 16) & 0xff] +
      lut[(d0 >> 24) & 0xff] +
      "-" +
      lut[d1 & 0xff] +
      lut[(d1 >> 8) & 0xff] +
      "-" +
      lut[((d1 >> 16) & 0x0f) | 0x40] +
      lut[(d1 >> 24) & 0xff] +
      "-" +
      lut[(d2 & 0x3f) | 0x80] +
      lut[(d2 >> 8) & 0xff] +
      "-" +
      lut[(d2 >> 16) & 0xff] +
      lut[(d2 >> 24) & 0xff] +
      lut[d3 & 0xff] +
      lut[(d3 >> 8) & 0xff] +
      lut[(d3 >> 16) & 0xff] +
      lut[(d3 >> 24) & 0xff]
    );
  };

  regex = (expression) => {};

  constructor() {
    var lut = [];
    for (var i = 0; i < 256; i++) {
      lut[i] = (i < 16 ? "0" : "") + i.toString(16);
    }
    this.lut = lut;
  }

  deleteProperty(source, key) {
    if (!source) {
      return;
    }
    delete source[key];
  }

  // https://stackoverflow.com/questions/18279141/javascript-string-encryption-and-decryption
  encrypt(message, password) {
    var encrypted = CryptoJS.AES.encrypt(message, password);
    return encrypted;
  }

  decrypted(encrypted, password) {
    var encrypted = CryptoJS.AES.decrypt(encrypted, password);
    return encrypted;
  }

  dateAsTimeMilliseconds(value) {
    return Date.parse(value);
  }

  encodeURIComponent(input) {
    return encodeURIComponent(input);
  }

  decodeURIComponent(input) {
    return decodeURIComponent(input);
  }

  distinctArrayOfObjects = (arr, prop) => {
    var keys = {};
    let key = "";
    let element = null;
    const response = [];
    for (var i = 0; i < arr.length; i++) {
      element = arr[i];
      key = element[prop];
      if (!keys[key]) {
        keys[key] = 1;
        response.push(element);
      }
    }
    keys = null;
    return response;
  };

  intersectionOfTwoArraysOfObjects = (array1, array2, prop) => {
    var res = array1.filter((el1) =>
      array2.some((el2) => el2[prop] == el1[prop])
    );
    return res;
  };

  differenceOfTwoArraysOfObjects = (array1, array2, prop) => {
    var res = array1.filter(
      (el1) => !array2.some((el2) => el2[prop] == el1[prop])
    );
    return res;
  };

  differenceOfTwoArraysOfObjectsRight = (array1, array2, prop) => {
    return this.differenceOfTwoArraysOfObjects(array2, array1, prop);
  };
}

module.exports = new MethodLibrary();

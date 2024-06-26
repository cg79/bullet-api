
const { guid } = require('../utils/utils');

module.exports = function(cryptoJS) {
    var models = {
        salt: function() 
        { 
            return guid();
        },
        encrypt: function(str,salt) 
        {
            var key = cryptoJS.enc.Utf8.parse(salt);
            var iv = cryptoJS.enc.Utf8.parse("1234567899123456");

            var encrypted = cryptoJS.AES.encrypt(cryptoJS.enc.Utf8.parse(str), key, {
             keySize: 256,
             iv: iv,
             mode: cryptoJS.mode.CBC,
             padding: cryptoJS.pad.Pkcs7
            });

            return encrypted.toString();
        }
    };
    return models;
}
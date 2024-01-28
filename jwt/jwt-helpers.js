

const jsonwebtoken = require('jsonwebtoken');


// const tokenPassword = 'djfhkjhf34rrkjhk3jh';
class JwtHelpers {
    sign(tokenObj, bulletKeyData,) {
        const { tokenPassword, tokenExpire } = bulletKeyData;
        const expire = {};
        if (tokenExpire) {
            expire.expiresIn = tokenExpire;
        }
        const token = jsonwebtoken.sign(tokenObj, tokenPassword, expire);
        return token;
    }

    async verifyToken(token, tokenPassword) {
        const r = await jsonwebtoken.verify(token, tokenPassword);
        return r;
    }

   verify = async (token, bulletKeyData) => {
        const { tokenPassword } = bulletKeyData;
        const r = await this.verifyToken(token, tokenPassword);
        return r;
    }


}

module.exports = new JwtHelpers();
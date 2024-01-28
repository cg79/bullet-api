/* eslint-disable no-underscore-dangle */
/* eslint-disable radix */
/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable no-throw-literal */
// https://scotch.io/tutorials/using-mongoosejs-in-node-js-and-mongodb-applications
// https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens#set-up-our-node-application-(package-json)

const { guid } = require("../../utils/utils");
const cryptoJS = require("node-cryptojs-aes").CryptoJS;

const encryption = require("../../utils/encryption")(cryptoJS);
const Logger = require("../../logger/logger");
const MongoStore = require("../../mongo/mongo-store");
const USER_ERROR = require("./user-errors");
const { SYS_DBS } = require("../../constants/constants");
const { sign } = require("../../jwt/jwt-helpers");
const BulletError = require("../../errors/bulletError");
const bulletHelpers = require("../bullet/bullet-helpers");
const mongoDefaultStore = require("../../mongo/mongo-default-store");

class UserService {
  async registerUser(bbody) {
    const { body } = bbody;
    console.log(body);

    if (!body) {
      throw { message: USER_ERROR.INPUT_DATA };
    }

    bbody.body.isrootuser = true;
    this.verifyEmail(body);

    const { email, password, bulletKey } = body;

    const userFromMainDb = await mongoDefaultStore.findOneDef(SYS_DBS.USERS, {
      email,
    });
    if (userFromMainDb) {
      throw { message: USER_ERROR.EMAIL_ALREADY_EXISTS };
    }

    const existentUser = await MongoStore.findOneStore(
      bulletKey.guid,
      SYS_DBS.USERS,
      {
        email: body.email.toLowerCase(),
      }
    );

    if (existentUser) {
      throw { message: USER_ERROR.EMAIL_ALREADY_EXISTS };
    }

    const salt = bulletKey.tokenPassword; // encryption.salt();
    const encryptedPassword = this.encryptPassword(password, salt);

    const confirm = guid();

    const dbUser = {
      ...body,
      password: encryptedPassword,
      salt,
      confirm,
      // bulletGuid: bulletKey.guid,
    };

    await mongoDefaultStore.insertDef(SYS_DBS.USERS, dbUser);

    const insertedIdObj = await MongoStore.insertStore(
      bulletKey.guid,
      SYS_DBS.USERS,
      dbUser
    );
    dbUser._id = insertedIdObj._id;

    const response = {
      ...dbUser,
    };
    delete response.password;
    delete response.salt;
    delete response.token_date;

    // return this.createUserResponse(response);
    const userResponse = this.createTokenObj(response, bulletKey);
    return userResponse;
  }
  async createRootUser(bbody) {
    const { body, bulletDataKey } = bbody;

    if (!body) {
      throw { message: USER_ERROR.INPUT_DATA };
    }

    bbody.body.isrootuser = true;
    this.verifyEmail(body);

    const { email, password } = body;

    const existentUser = await MongoStore.findOneStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      {
        email,
      }
    );

    if (existentUser) {
      return;
      throw { message: USER_ERROR.EMAIL_ALREADY_EXISTS };
    }

    const salt = bulletDataKey.tokenPassword;
    const encryptedPassword = this.encryptPassword(password, salt);

    const confirm = guid();

    const dbUser = {
      ...body,
      password: encryptedPassword,
      salt,
      confirm,
    };

    const insertedIdObj = await MongoStore.insertStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      dbUser
    );
    dbUser._id = insertedIdObj._id;

    const response = {
      ...dbUser,
    };
    delete response.password;
    delete response.salt;
    delete response.token_date;

    return this.createUserResponse(response);
  }

  async users(bullet) {
    const { page, sort, tokenObj, take, bulletDataKey } = bullet;

    const collectionName = SYS_DBS.USERS;
    let { find = {} } = bullet;

    const newFind = find; //this.ensureFindExpression(find, {});

    const mongoCollection = await MongoStore.bulletDataCollection(
      bulletDataKey,
      collectionName
    );
    let filter = await mongoCollection.find(newFind);

    page.itemsOnPage = parseInt(page.itemsOnPage);
    page.pageNo--;
    filter = filter
      .limit(page.itemsOnPage)
      .skip(page.itemsOnPage * page.pageNo);

    filter = sort ? filter.sort(sort) : filter;

    let items = await filter.toArray();
    const count = await MongoStore.bulletDataCollection(
      bulletDataKey,
      collectionName
    ).countDocuments(newFind);

    items = bulletHelpers.readSpecificFields(items, take);

    let results = {
      records: items,
      count,
      pageCount: Math.ceil(count / page.itemsOnPage),
      pageNo: page ? page.pageNo + 1 : 0,
    };

    return results;
  }

  async createUser(bbody) {
    const { body, bulletDataKey } = bbody;

    if (!body) {
      throw { message: USER_ERROR.INPUT_DATA };
    }

    //prevent security issues by creatung a root user by someone without permissions
    delete body.isrootuser;

    this.verifyEmail(body);
    this.verifyPassword(body);

    const { email, password } = body;

    const existentUser = await MongoStore.findOneStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      {
        email,
      }
    );

    if (existentUser) {
      throw { message: USER_ERROR.EMAIL_ALREADY_EXISTS };
    }

    const encryptedPassword = this.encryptPassword(
      password,
      bulletDataKey.tokenPassword
    );
    // encryption.encrypt(
    //   password,
    //   bulletDataKey.tokenPassword
    // );

    const confirm = guid();

    const dbUser = {
      ...body,
      password: encryptedPassword,
      confirm,
    };

    const insertedIdObj = await MongoStore.insertStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      dbUser
    );
    dbUser._id = insertedIdObj._id;

    const response = {
      ...dbUser,
    };
    delete response.password;
    delete response.salt;
    delete response.token_date;

    return this.createUserResponse(response);
  }
  async login(bbody) {
    debugger;
    const { body, bulletDataKey } = bbody;

    if (!bbody) {
      throw { message: USER_ERROR.INPUT_DATA };
    }

    // this.verifyEmail(body);
    // this.verifyPassword(body);

    const { email, user, login, password } = body;

    const emailOrUser = email || user || login;
    if (!emailOrUser) {
      throw { message: USER_ERROR.EMAIL_EMPTY };
    }
    debugger;

    const dbUser = await MongoStore.findOneStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      {
        email: emailOrUser.toLowerCase(),
      }
    );

    if (!dbUser) {
      throw { message: USER_ERROR.USER_NOT_FOUND };
    }

    console.log(dbUser);
    console.log(this.encryptPassword("a1", bulletDataKey.tokenPassword));
    const encrytedPassword = this.encryptPassword(
      password,
      bulletDataKey.tokenPassword
    );
    // if (encrytedPassword !== dbUser.password) {
    //   throw { message: USER_ERROR.INVALID_PASSWORD };
    // }

    console.log(dbUser);

    const userResponse = this.createTokenObj(dbUser, bulletDataKey);

    delete userResponse.confirm;

    return userResponse;
  }

  async createUserAndLogin(bbody) {
    await this.createUser(bbody);

    const response = await this.login(bbody);

    return response;
  }
  async update(bbody) {
    const { body, tokenObj, bulletDataKey } = bbody;
    if (!body) {
      throw USER_ERROR.INPUT_DATA;
    }

    delete body.confirm;
    delete body.confirmed;
    delete body.email;
    delete body.password;
    delete body.reset;
    delete body.isrootuser;

    // const user = await MongoStore.findOneByIdStore(x_bullet_key, SYS_DBS.USERS, tokenObj._id);

    // if (!user) {
    //   throw { message: USER_ERROR.USER_NOT_FOUND };
    // }

    // const newUserValues = {
    //   ...user,
    //   ...body,
    // }
    // delete newUserValues._id;

    await MongoStore.updateOneByIdStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      tokenObj._id,
      {
        props: body,
      }
    );

    throw new BulletError(USER_ERROR.USER_UPDATED);
  }

  async forgotPassword(bbody) {
    // system generate a resetcode
    // this code must be sent through the email

    const { body, bulletDataKey } = bbody;
    if (!body) {
      throw { message: EMAIL_ALREADY_EXISTS.INPUT_DATA };
    }

    this.verifyEmail(body);

    const dbUser = await MongoStore.findOneStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      {
        email: body.email.toLowerCase(),
      }
    );

    if (!dbUser) {
      throw { message: USER_ERROR.USER_NOT_FOUND };
    }

    body.reset = guid();

    await MongoStore.updateOneStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      {
        _id: dbUser._id,
      },
      {
        reset: body.reset,
      }
    );

    return {
      reset: body.reset,
    };
    //todo_user --> send email or code on phone
  }
  async confirm(bbody) {
    const { body, bulletDataKey } = bbody;
    if (!body) {
      throw { message: USER_ERROR.INPUT_DATA };
    }
    if (!body.code) {
      throw { message: USER_ERROR.CONFIRM_CODE_EMPTY };
    }
    const dbResult = await MongoStore.updateOneStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      {
        confirm: body.code,
      },
      {
        confirmed: true,
      }
    );

    // console.log('ppollo', dbResult);
    if (dbResult.modifiedCount === 0) {
      throw { message: USER_ERROR.RESET_NOT_FOUND };
    }

    throw new BulletError(USER_ERROR.USER_CONFIRMED);
  }

  async resetPassword(bbody) {
    //user changes his password

    const { body, bulletDataKey } = bbody;
    if (!body.reset) {
      throw { message: USER_ERROR.RESET_EMPTY };
    }
    const dbUser = await MongoStore.findOneStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      {
        reset: body.reset,
      }
    );
    if (!dbUser) {
      throw { message: USER_ERROR.USER_NOT_FOUND };
    }

    this.verifyPassword(body);

    const salt = bulletDataKey.tokenPassword;
    const encryptedPassword = this.encryptPassword(body.password, salt);

    const dbResult = await MongoStore.updateOneStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      {
        reset: body.reset,
      },
      {
        password: encryptedPassword,
        salt,
      }
    );

    if (dbResult.modifiedCount === 0) {
      throw { message: USER_ERROR.RESET_NOT_FOUND };
    }

    return { message: USER_ERROR.PASSWORD_CHANGED };
  }

  async logout(bbody) {
    // user is logged
    // console.log('asdasdasdasd', body);
    const { body, bulletDataKey, tokenObj } = bbody;
    // if (!body) {
    //   throw { message: USER_ERROR.INPUT_DATA };
    // }
    const dbUser = await MongoStore.findOneByIdStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      tokenObj._id
    );
    if (!dbUser) {
      throw { message: USER_ERROR.USER_NOT_FOUND };
    }

    await MongoStore.updateOneStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      {
        _id: tokenObj._id,
      },
      {
        loggedout: new Date().getTime(),
      }
    );

    throw new BulletError(USER_ERROR.LOGGED_OUT);
  }

  encryptPassword(password, salt) {
    return encryption.encrypt(password, salt);
  }

  async changePassword(bbody) {
    // user is logged
    // console.log('asdasdasdasd', body);
    const { body, bulletDataKey, tokenObj } = bbody;
    if (!body) {
      throw { message: USER_ERROR.INPUT_DATA };
    }
    const dbUser = await MongoStore.findOneByIdStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      tokenObj._id
    );
    if (!dbUser) {
      throw { message: USER_ERROR.USER_NOT_FOUND };
    }

    this.verifyPassword(body);

    const password = this.encryptPassword(body.password, dbUser.salt);

    const dbResult = await MongoStore.updateOneStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      {
        _id: tokenObj._id,
      },
      {
        password,
      }
    );

    throw new BulletError(USER_ERROR.PASSWORD_CHANGED);
  }

  async delete(bbody) {
    const { body, bulletDataKey, tokenObj } = bbody;
    if (!body) {
      throw USER_ERROR.INPUT_DATA;
    }

    await MongoStore.deleteOneByIdStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      tokenObj._id
    );

    throw new BulletError(USER_ERROR.USER_DELETED);
  }

  async inactivate(bbody) {
    const { body, bulletDataKey, tokenObj } = bbody;

    if (!body) {
      throw USER_ERROR.INPUT_DATA;
    }
    await MongoStore.updateOneByIdStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      tokenObj._id,
      {
        active: false,
      }
    );

    throw new BulletError(USER_ERROR.USER_INACTIVE);
  }

  async activate(bbody) {
    const { body, bulletDataKey, tokenObj } = bbody;
    if (!body) {
      throw USER_ERROR.INPUT_DATA;
    }

    await MongoStore.updateOneByIdStore(
      bulletDataKey.guid,
      SYS_DBS.USERS,
      tokenObj._id,
      {
        active: true,
      }
    );

    throw new BulletError(USER_ERROR.USER_ACTIVE);
  }

  verifyEmail(body) {
    if (!body.email) {
      throw { message: USER_ERROR.EMAIL_EMPTY };
    }

    body.email = body.email.toLowerCase();

    if (body.email.indexOf("@") === -1) {
      throw {
        message: USER_ERROR.EMAIL_INVALID,
      };
    }
  }

  verifyPassword(body) {
    if (!body.password) {
      throw { message: USER_ERROR.PASSWORD_EMPTY };
    }

    if (body.password.length < 2) {
      throw { message: USER_ERROR.PASSWORD_LENGTH_MIN };
    }
  }

  createUserResponse(body) {
    const _id = body._id.toString();
    const response = {
      ...body,
      _id,
      token_date: new Date(),
    };
    delete response.password;
    delete response.salt;
    // delete response.confirm;
    delete response.reset;

    return response;
  }

  createTokenObj(body, bulletDataKey) {
    try {
      if (!bulletDataKey) {
        throw "non bullet data key";
      }
      const tokenObj = this.createUserResponse(body);
      tokenObj.bkguid = bulletDataKey.guid;

      const token = sign(tokenObj, bulletDataKey);

      return {
        ...tokenObj,
        token,
      };
    } catch (ex) {
      // console.log(ex);
    }
  }
}

module.exports = new UserService();

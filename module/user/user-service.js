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
const USER_ERROR = require("./user-errors");
const { sign } = require("../../jwt/jwt-helpers");
const BulletError = require("../../errors/bulletError");
const bulletHelpers = require("../bullet/bullet-helpers");
const { DEFAULT_DB_KEY, SYS_DBS } = require("../../constants/constants");
const { ObjectId } = require("mongodb");
const emailMethods = require("../email/emailMethods");
const utils = require("../../utils/utils");
const pubSub = require("../../pubsub/pubsub");

class UserService {
  async createRootUser(bodyTokenAndBulletConnection) {
    const { body, bulletConnection } = bodyTokenAndBulletConnection;
    const { bulletDataKey } = bulletConnection;

    if (!body) {
      throw { message: USER_ERROR.INPUT_DATA };
    }

    bodyTokenAndBulletConnection.body.isrootuser = true;
    this.verifyEmail(body);

    const { email, password } = body;

    const existentUser = await bulletConnection.findOne(SYS_DBS.USERS, {
      email,
    });

    if (existentUser) {
      return;
    }

    const salt = encryption.salt();
    const encryptedPassword = encryption.encrypt(password, salt);

    const confirm = guid();

    const dbUser = {
      ...body,
      password: encryptedPassword,
      salt,
      confirm,
    };

    const insertedIdObj = await bulletConnection.insertOne(
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
    const { page, sort, tokenObj, take, bulletConnection } = bullet;
    const { bulletDataKey } = bulletConnection;

    const collectionName = SYS_DBS.USERS;
    let { find = {} } = bullet;

    const newFind = find; //this.ensureFindExpression(find, {});

    const mongoCollection = bulletConnection.getCollection(collectionName);
    let filter = await mongoCollection.find(newFind);

    page.itemsOnPage = parseInt(page.itemsOnPage);
    page.pageNo--;
    filter = filter
      .limit(page.itemsOnPage)
      .skip(page.itemsOnPage * page.pageNo);

    filter = sort ? filter.sort(sort) : filter;

    let items = await filter.toArray();
    const count = await mongoCollection.countDocuments(newFind);

    items = bulletHelpers.readSpecificFields(items, take);

    let results = {
      records: items,
      count,
      pageCount: Math.ceil(count / page.itemsOnPage),
      pageNo: page ? page.pageNo + 1 : 0,
    };

    return results;
  }

  async createUser(bodyTokenAndBulletConnection) {
    const { body, bulletConnection } = bodyTokenAndBulletConnection;
    const { bulletDataKey } = bulletConnection;

    if (!body) {
      throw { message: USER_ERROR.INPUT_DATA };
    }

    //prevent security issues by creatung a root user by someone without permissions
    delete body.isrootuser;

    this.verifyEmail(body);
    this.verifyPassword(body);

    const {
      email,
      password,
      nick,
      isInvited = false,
      clientId = "",
      provider,
    } = body;
    if (!nick) {
      throw { message: USER_ERROR.NICK_EMPTY };
    }

    let existentUser = null;
    if (clientId) {
      existentUser = await bulletConnection.findOne(SYS_DBS.USERS, {
        email,
        clientId,
      });
      if (existentUser) {
        // throw { message: USER_ERROR.USER_ALREADY_INVITED };
        return {
          _id: existentUser._id,
          email: existentUser.email,
        };
      }
    } else {
      existentUser = await bulletConnection.findOne(SYS_DBS.USERS, {
        email,
      });
      if (existentUser) {
        throw { message: USER_ERROR.EMAIL_ALREADY_EXISTS };
      }
    }

    const salt = encryption.salt();
    const encryptedPassword = encryption.encrypt(password, salt);

    const confirm = guid();
    const passwordField = provider ? provider : "password";

    const dbUser = {
      ...body,
      [passwordField]: encryptedPassword,
      salt,
      confirm,
      clientId: clientId || utils.guid(),
    };

    const insertedIdObj = await bulletConnection.insertOne(
      SYS_DBS.USERS,
      dbUser
    );
    dbUser._id = insertedIdObj._id;

    const response = {
      ...dbUser,
    };
    delete response.password;
    if (provider) {
      delete response[provider];
    }
    delete response.salt;
    delete response.token_date;

    const clonedUser = {
      userid: dbUser._id,
      clientId: dbUser.clientId,
      nick: dbUser.nick,
    };
    await bulletConnection.insertOne(`users_${dbUser.clientId}`, clonedUser);

    const userResponse = this.createTokenObj(response, bulletDataKey);

    return userResponse;
  }
  async login(bodyTokenAndBulletConnection) {
    const { body, bulletConnection } = bodyTokenAndBulletConnection;
    const { bulletDataKey } = bulletConnection;

    if (!bodyTokenAndBulletConnection) {
      throw { message: USER_ERROR.INPUT_DATA };
    }

    // this.verifyEmail(body);
    // this.verifyPassword(body);

    const { email, user, login, password, provider } = body;
    debugger;

    const emailOrUser = email || user || login;
    if (!emailOrUser) {
      throw { message: USER_ERROR.EMAIL_EMPTY };
    }

    let dbUser = await bulletConnection.findOne(SYS_DBS.USERS, {
      email: emailOrUser.toLowerCase(),
    });

    if (!dbUser) {
      if (!provider) {
        throw { message: USER_ERROR.USER_NOT_FOUND };
      }
      await this.createUser(bodyTokenAndBulletConnection);
      dbUser = await bulletConnection.findOne(SYS_DBS.USERS, {
        email: emailOrUser.toLowerCase(),
      });
      if (!dbUser) {
        throw { message: USER_ERROR.USER_NOT_FOUND };
      }
    }

    const encrytedPassword = encryption.encrypt(password, dbUser.salt);

    const dbPassword = provider ? dbUser[provider] : dbUser.password;

    if (encrytedPassword !== dbPassword) {
      throw { message: USER_ERROR.INVALID_PASSWORD };
    }

    console.log(dbUser);

    const userResponse = this.createTokenObj(dbUser, bulletDataKey);

    delete userResponse.confirm;

    return userResponse;
  }

  async update(bodyTokenAndBulletConnection) {
    const { body, tokenObj, bulletConnection } = bodyTokenAndBulletConnection;
    const { bulletDataKey } = bulletConnection;
    if (!body) {
      throw USER_ERROR.INPUT_DATA;
    }

    delete body.confirm;
    delete body.confirmed;
    delete body.email;
    delete body.password;
    delete body.reset;
    delete body.isrootuser;

    await bulletConnection.updateOneById(SYS_DBS.USERS, tokenObj._id, {
      props: body,
    });

    throw new BulletError(USER_ERROR.USER_UPDATED);
  }

  async forgotPassword(bodyTokenAndBulletConnection) {
    // system generate a resetcode
    // this code must be sent through the email

    const { body, bulletConnection } = bodyTokenAndBulletConnection;
    const { bulletDataKey } = bulletConnection;
    if (!body) {
      throw { message: EMAIL_ALREADY_EXISTS.INPUT_DATA };
    }

    this.verifyEmail(body);

    const dbUser = await bulletConnection.findOne(SYS_DBS.USERS, {
      email: body.email.toLowerCase(),
    });

    if (!dbUser) {
      throw { message: USER_ERROR.USER_NOT_FOUND };
    }

    body.reset = guid();

    await bulletConnection.updateOne(
      SYS_DBS.USERS,
      {
        _id: dbUser._id,
      },
      {
        $set: {
          reset: body.reset,
        },
      }
    );

    await emailMethods.sendForgotPasswordEmail(body.email, body.reset);

    return {
      reset: body.reset,
    };
    //todo_user --> send email or code on phone
  }
  async confirm(bodyTokenAndBulletConnection) {
    const { body, bulletConnection } = bodyTokenAndBulletConnection;
    const { bulletDataKey } = bulletConnection;
    if (!body) {
      throw { message: USER_ERROR.INPUT_DATA };
    }
    if (!body.code) {
      throw { message: USER_ERROR.CONFIRM_CODE_EMPTY };
    }
    const dbResult = await bulletConnection.updateOne(
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

  async resetPassword(bodyTokenAndBulletConnection) {
    //user changes his password

    const { body, bulletConnection } = bodyTokenAndBulletConnection;
    const { bulletDataKey } = bulletConnection;
    if (!body.reset) {
      throw { message: USER_ERROR.RESET_EMPTY };
    }
    const dbUser = await bulletConnection.findOne(SYS_DBS.USERS, {
      reset: body.reset,
    });
    if (!dbUser) {
      throw { message: USER_ERROR.USER_NOT_FOUND };
    }

    this.verifyPassword(body);

    const salt = dbUser.salt; // || encryption.salt();
    const encryptedPassword = encryption.encrypt(body.password, salt);

    const dbResult = await bulletConnection.updateOne(
      SYS_DBS.USERS,
      {
        reset: body.reset,
      },
      {
        $set: {
          password: encryptedPassword,
          // salt,
        },
      }
    );

    if (dbResult.modifiedCount === 0) {
      throw { message: USER_ERROR.RESET_NOT_FOUND };
    }

    return { message: USER_ERROR.PASSWORD_CHANGED };
  }

  async logout(bodyTokenAndBulletConnection) {
    // user is logged
    // console.log('asdasdasdasd', body);
    const { body, bulletConnection, tokenObj } = bodyTokenAndBulletConnection;
    const { bulletDataKey } = bulletConnection;
    // if (!body) {
    //   throw { message: USER_ERROR.INPUT_DATA };
    // }
    const dbUser = await bulletConnection.findOneById(
      SYS_DBS.USERS,
      tokenObj._id
    );
    if (!dbUser) {
      throw { message: USER_ERROR.USER_NOT_FOUND };
    }

    await bulletConnection.updateOne(
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

  async changePassword(bodyTokenAndBulletConnection) {
    // user is logged
    // console.log('asdasdasdasd', body);
    const { body, bulletConnection, tokenObj } = bodyTokenAndBulletConnection;
    const { bulletDataKey } = bulletConnection;
    if (!body) {
      throw { message: USER_ERROR.INPUT_DATA };
    }
    const dbUser = await bulletConnection.findOneById(
      SYS_DBS.USERS,
      tokenObj._id
    );
    if (!dbUser) {
      throw { message: USER_ERROR.USER_NOT_FOUND };
    }

    this.verifyPassword(body);

    const password = encryption.encrypt(body.password, dbUser.salt);

    const dbResult = await bulletConnection.updateOne(
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

  async deleteAccount(bodyTokenAndBulletConnection = {}) {
    const { bulletConnection, tokenObj } = bodyTokenAndBulletConnection;
    const { bulletDataKey } = bulletConnection;

    await bulletConnection.deleteOne(SYS_DBS.USERS, {
      _id: ObjectID(tokenObj._id),
    });

    const isRootDatabase = bulletDataKey.guid === DEFAULT_DB_KEY;
    if (!isRootDatabase && tokenObj.isrootuser) {
      await bulletConnection.deleteOne(SYS_DBS.BULLET_KEYS, {
        database: bulletDataKey.database,
      });
      bulletDataKey.db.dropDatabase();

      return;
    }
  }

  async inactivate(bodyTokenAndBulletConnection) {
    const { body, bulletConnection, tokenObj } = bodyTokenAndBulletConnection;
    const { bulletDataKey } = bulletConnection;

    if (!body) {
      throw USER_ERROR.INPUT_DATA;
    }
    await bulletConnection.updateOneById(SYS_DBS.USERS, tokenObj._id, {
      active: false,
    });

    throw new BulletError(USER_ERROR.USER_INACTIVE);
  }

  async activate(bodyTokenAndBulletConnection) {
    const { body, bulletConnection, tokenObj } = bodyTokenAndBulletConnection;
    const { bulletDataKey } = bulletConnection;
    if (!body) {
      throw USER_ERROR.INPUT_DATA;
    }

    await bulletConnection.updateOneById(SYS_DBS.USERS, tokenObj._id, {
      active: true,
    });

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
      body.bulletKey = bulletDataKey.guid;
      // body.isrootuser = bulletDataKey.guid === DEFAULT_DB_KEY;

      const tokenObj = this.createUserResponse(body);
      tokenObj.bulletKey = bulletDataKey.guid;

      const token = sign(tokenObj, bulletDataKey);

      return {
        ...tokenObj,
        token,
      };
    } catch (ex) {
      // console.log(ex);
    }
  }

  async sendEntityInvitation(bodyTokenAndBulletConnection) {
    debugger;
    const { body, bulletConnection, tokenObj } = bodyTokenAndBulletConnection;
    const { entityId, email, difs } = body;
    const { clientId } = tokenObj;
    body.clientId = clientId;
    delete body._id;

    const invitationsCollectionName = `_invitations${clientId}`;
    const findCriteria = {
      email,
    };
    if (entityId) {
      findCriteria.entityId = entityId;
    }

    const dbInvitationRecord = await bulletConnection.findOne(
      invitationsCollectionName,
      findCriteria
    );
    if (dbInvitationRecord) {
      if (difs && difs.name) {
        await bulletConnection.updateOneById(
          invitationsCollectionName,
          dbInvitationRecord._id,
          {
            $set: {
              name: difs.name.current,
            },
          }
        );
      }
      throw new Error("INVITATION_ALREADY_SENT");
    }

    await bulletConnection.insertOne(invitationsCollectionName, body);

    await emailMethods.sendInvitationEmail(body);
    return {
      success: true,
    };
  }

  sendInvitation(bodyTokenAndBulletConnection) {
    debugger;
    const { body, bulletConnection } = bodyTokenAndBulletConnection;
    emailMethods.sendInvitationEmail(body);
  }
  async acceptInvitation(bodyTokenAndBulletConnection) {
    debugger;
    const { body, bulletConnection } = bodyTokenAndBulletConnection;

    const { _id, clientId, entityId } = body;
    const invitationsCollectionName = `_invitations${clientId}`;
    const dbInvitationRecord = await bulletConnection.findOneById(
      invitationsCollectionName,
      _id
    );
    if (!dbInvitationRecord) {
      throw new Error("Invitation not found");
    }

    const findCriteria = {
      email: dbInvitationRecord.email,
      accepted: true,
    };

    const allUserInvitations = await bulletConnection.find(
      invitationsCollectionName,
      findCriteria
    );

    let tokenResponse = null;
    if (allUserInvitations.length === 0) {
      body.email = dbInvitationRecord.email;
      body.isInvited = true;
      tokenResponse = await this.createUser(bodyTokenAndBulletConnection);
    }

    const updatedResponse = await bulletConnection.updateOneById(
      invitationsCollectionName,
      _id,
      {
        $set: {
          accepted: true,
        },
      }
    );
    console.log(updatedResponse);
    return tokenResponse;
  }

  async getEntityInvitations(bodyTokenAndBulletConnection) {
    debugger;
    const { body, bulletConnection, tokenObj } = bodyTokenAndBulletConnection;
    const { clientId, email } = tokenObj;
    const { entityId } = body;
    const invitationsCollectionName = `_invitations${clientId}`;
    const filterCriteria = tokenObj.isInvited ? { email } : {};

    if (entityId) {
      filterCriteria.entityId = entityId;
    }

    const invitations = await bulletConnection.find(
      invitationsCollectionName,
      filterCriteria
    );
    return invitations;
    // const assignedEntitiesIds = invitations.map((invitation) => {
    //   return invitation.entityId;
    // }, []);
    // body.find = {
    //   in: { _id: assignedEntitiesIds.map((id) => new ObjectId(id)) },
    // };

    // const entities = await bulletConnection.find(
    //   `money_entity_${clientId}`,
    //   body
    // );
    // return entities;

    // bodyTokenAndBulletConnection.moduleName = "bullet";
    // bodyTokenAndBulletConnection.method = "page";
    // const response = await pubSub.publishOnce("executeMethodFromModule", {
    //   ...bodyTokenAndBulletConnection,
    //   ...bodyTokenAndBulletConnection.body,
    // });
    // return response;
  }

  async getMoneyEntitiesForInvitedUser(bodyTokenAndBulletConnection) {
    debugger;
    const { bulletConnection, tokenObj } = bodyTokenAndBulletConnection;
    const { clientId } = tokenObj;

    const invitations = await this.getEntityInvitations(
      bodyTokenAndBulletConnection
    );

    const assignedEntitiesIds = invitations.map((invitation) => {
      return invitation.entityId;
    }, []);

    const request = {
      find: {
        in: { _id: assignedEntitiesIds.map((id) => new ObjectId(id)) },
      },
    };

    const entities = await bulletConnection.find(
      `money_entity_${clientId}`,
      request
    );
    return entities;

    // bodyTokenAndBulletConnection.moduleName = "bullet";
    // bodyTokenAndBulletConnection.method = "page";
    // const response = await pubSub.publishOnce("executeMethodFromModule", {
    //   ...bodyTokenAndBulletConnection,
    //   ...bodyTokenAndBulletConnection.body,
    // });
    // return response;
  }

  async getCompaniesForInvitedUser(bodyTokenAndBulletConnection) {
    debugger;
    const { body, bulletConnection } = bodyTokenAndBulletConnection;
    const { clientId, email } = body;
    const invitationsCollectionName = `_invitations${clientId}`;
    const invitations = await bulletConnection.find(invitationsCollectionName, {
      email,
    });
    const assignedCompanies = invitations
      .map((invitation) => {
        return invitation.entityId;
      }, [])
      .filter((el) => el);

    body.find = {
      in: { _id: assignedCompanies.map((id) => new ObjectId(id)) },
    };

    bodyTokenAndBulletConnection.moduleName = "bullet";
    bodyTokenAndBulletConnection.method = "page";
    const response = await pubSub.publishOnce("executeMethodFromModule", {
      ...bodyTokenAndBulletConnection,
      ...bodyTokenAndBulletConnection.body,
    });
    return response;
  }
}

module.exports = new UserService();

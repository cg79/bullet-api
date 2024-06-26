/* eslint-disable no-underscore-dangle */
/* eslint-disable radix */
/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable no-throw-literal */
// https://scotch.io/tutorials/using-mongoosejs-in-node-js-and-mongodb-applications
// https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens#set-up-our-node-application-(package-json)

const { guid } = require("../../utils/utils");

const Logger = require("../../logger/logger");
const USER_ERROR = require("../user/user-errors");
const { SYS_DBS } = require("../../constants/constants");

class ConstraintsService {
  async update(bodyTokenAndBulletConnection) {
    const { body, bulletConnection, tokenObj } = bodyTokenAndBulletConnection;

    if (!body) {
      throw { message: USER_ERROR.INPUT_DATA };
    }

    const { _id, name, constraints } = body;

    // const existent = await bulletConnection.findOne(
    //   bulletDataKey,
    //   SYS_DBS.CONSTRAINTS,
    //   {
    //     name,
    //   }
    // );

    if (_id) {
      const bodyForUpdate = { ...body };
      delete bodyForUpdate._id;
      const updateResponse = await bulletConnection.updateOneById(
        SYS_DBS.CONSTRAINTS,
        _id,
        bodyForUpdate
      );

      // console.log(updateResponse);

      return bodyForUpdate;
    }

    const insertedIdObj = await bulletConnection.insertOne(
      SYS_DBS.CONSTRAINTS,
      body
    );
    body._id = insertedIdObj._id;

    const response = {
      ...body,
    };
    return response;
  }

  async getAll(bodyTokenAndBulletConnection) {
    const { body, bulletConnection } = bodyTokenAndBulletConnection;
    const { bulletDataKey } = bulletConnection;

    if (!body) {
      throw { message: USER_ERROR.INPUT_DATA };
    }

    const response = await bulletConnection.find(SYS_DBS.CONSTRAINTS);
    // console.log(response);

    return response;
  }
}

module.exports = new ConstraintsService();

/* eslint-disable no-plusplus */
/* eslint-disable no-console */
/* eslint-disable no-bitwise */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-undef */
/* eslint-disable func-names */
// require the Koa server
// const request = require("supertest");
// const USER_ERROR = require("../module/user/user-errors");
// const server = require("../server");

const { DEFAULT_DB_KEY } = require("../../constants/constants");
const { delay, generateEmail, generatePassword } = require("../test-helpers");
// require supertest

let loggedUser = null;

let startDate = 0;

class TestUserMethods {
  constructor(server, request) {
    this.server = server;
    this.request = request;
  }
  stopServer = () => {
    this.server.stop();
    console.log("server stopped");
  };

  sendManagementUserRequest = async (method, data) => {
    const token = loggedUser ? loggedUser.token : "";
    const response = await this.request(server)
      .post(`/bulletapi/management/${method}`)
      .set("x_bullet_key", DEFAULT_DB_KEY)
      .set("authorization", token)
      .send(data);
    return response;
  };

  sendLoggedUserRequest = async (method, data = {}) => {
    try {
      const { request, server, loggedUser } = this;
      const token = loggedUser ? loggedUser.token : "";
      const response = await request(server)
        .post(`/bulletapi/logged-user/${method}`)
        // .set("x_bullet_key", DEFAULT_DB_KEY)
        // .set("x_bullet_key", token)
        .set("authorization", token)
        .send(data);
      return response;
    } catch (err) {
      console.log(err);
      return null;
    }
  };

  sendPublicUserRequest = async (method, data, bulletKey) => {
    try {
      const { request, server } = this;
      const response = await request(server)
        .post(`/bulletapi/user/${method}`)
        .set("bulletKey", bulletKey || "")
        .send(data);
      return response;
    } catch (err) {
      console.log(err);
      return null;
    }
  };

  // createRootUser = async (userPayload = null) => {
  //   startDate = new Date().getTime();
  //   const payload = userPayload || {
  //     email: generateEmail(),
  //     password: generatePassword(),
  //   };

  //   const response = await this.sendPublicUserRequest("createUser", payload);
  //   return response;
  // };

  createUser = async (userPayload = null, bulletKey) => {
    startDate = new Date().getTime();
    const payload = userPayload || {
      email: generateEmail(),
      password: generatePassword(),
    };

    const response = await this.sendPublicUserRequest(
      "createUser",
      payload,
      bulletKey
    );
    return response;
  };

  loginUser = async (payload = null, bulletKey) => {
    startDate = new Date().getTime();

    const response = await this.sendPublicUserRequest(
      "login",
      payload,
      bulletKey
    );
    return response;
  };

  deleteAccount = async () => {
    startDate = new Date().getTime();
    const response = await this.sendLoggedUserRequest("deleteUser");
    return response;
  };

  deleteRootUser = async (userPayload) => {
    startDate = new Date().getTime();

    const response = await this.sendPublicUserRequest("createUser", payload);
    return response;
  };
}

module.exports = { TestUserMethods };

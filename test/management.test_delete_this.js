/* eslint-disable no-plusplus */
/* eslint-disable no-console */
/* eslint-disable no-bitwise */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-undef */
/* eslint-disable func-names */
// require the Koa server
const request = require("supertest");
const USER_ERROR = require("../module/user/user-errors");
const server = require("../server");
const { guid } = require("../utils/utils");
// require supertest

function generateGuid() {
  return guid();
}

function generateEmail() {
  return `${generateGuid()}@test.com`;
}

function generatePassword() {
  return `pass -${generateGuid()}`;
}

const delay = (time = 1000) =>
  new Promise((resolve) => setTimeout(resolve, time));

let loggedUser = null;
let startDate = 0;

const sendLoggedUserRequest = async (method, data) => {
  const token = loggedUser ? loggedUser.token : "";
  const response = await request(server)
    .post(`/bulletapi/private/management/${method}`)
    .set("authorization", token)
    .send(data);
  return response;
};

const sendUserRequest = async (method, data) => {
  const response = await request(server)
    .post(`/bulletapi/user/${method}`)
    .send(data);
  return response;
};

describe("routes: user", () => {
  afterAll((done) => {
    try {
      server.stop();
    } catch (ex) {
      // console.log(ex);
    }

    done();
  });

  test("create user ", async () => {
    await delay(1000);

    startDate = new Date().getTime();
    const body = {
      email: "a@a.com",
      password: "FullsdBullet1",
    };

    const response = await sendAnonymousUserRequest("createUser", body);

    expect(response.status).toEqual(200);
  });

  test("login ", async () => {
    startDate = new Date().getTime();
    const body = {
      email: "a@a.com",
      password: "FullsdBullet1",
    };

    const response = await sendAnonymousUserRequest("login", body);

    loggedUser = response.body.data;

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeTruthy();
  });

  test("add bullet api ", async () => {
    startDate = new Date().getTime();
    const body = {
      password: generatePassword(),
    };

    const response = await sendLoggedUserRequest("createBulletKey", body);

    // console.log(response.body);

    expect(response.status).toEqual(200);
    expect(response.body.data.key).toBeDefined();
  });
});

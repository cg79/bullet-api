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

// const { DEFAULT_USER, DEFAULT_DB_KEY } = require("../constants/constants");
const { delay, generateEmail, generatePassword } = require("./test-helpers");
const { TestUserMethods } = require("./methods/test-user-methods");
const utils = require("../utils/utils");
// require supertest

let startDate = 0;

const testUserMethods = new TestUserMethods(server, request);

describe("routes: user", () => {
  // afterAll((done) => {
  //   try {
  //     testUserMethods.stopServer();
  //   } catch (ex) {
  //     // console.log(ex);
  //   }

  //   done();
  // });

  let memoryData = {};

  test("create default user ", async () => {
    // await delay(1000);

    startDate = new Date().getTime();
    const request = {
      email: generateEmail(),
      password: generatePassword(),
    };

    memoryData.rootUserRequest = request;

    const response = await testUserMethods.createUser(request);

    const { body } = response;
    const { data } = body;
    console.log("body", body);

    expect(response.status).toEqual(200);
    expect(body.message).toEqual(undefined);
    expect(body.success).toEqual(true);

    expect(data.token).toBeDefined();
    expect(data.isrootuser).toEqual(false);
    expect(data.bulletKey).toBeDefined();
    // memoryData.rootUserResponse = data;
    testUserMethods.loggedUser = data;

    console.log(data);
  });

  test("create another root user with the same email ", async () => {
    // await delay(1000);

    startDate = new Date().getTime();

    const response = await testUserMethods.createUser(
      memoryData.rootUserRequest
    );

    const { body } = response;
    const { data } = body;
    console.log("body", body);

    expect(response.status).toEqual(200);
    expect(body.message).toEqual("EMAIL_ALREADY_EXISTS");
    expect(body.success).toEqual(false);

    console.log(data);
  });

  test("delete user ", async () => {
    // await delay(1000);

    startDate = new Date().getTime();

    const response = await testUserMethods.deleteAccount();

    const { body } = response;
    const { data } = body;
    console.log("body", body);

    expect(response.status).toEqual(200);
    expect(body.success).toEqual(true);

    console.log(data);
  });

  // test('delete ', async () => {

  //   startDate = new Date().getTime();
  //   const body = {
  //   };

  //   const response = await sendLoggedUserRequest(loggedUser, 'delete',body)

  //   console.log('1112', response.body);
  //   expect(response.status).toEqual(200);
  //   expect(response.body.data.success).toBeTruthy();
  //   expect(response.body.data.message).toEqual(USER_ERROR.USER_DELETED);
  // });

  // user management

  // test('delete bullet key ', async () => {

  //   startDate = new Date().getTime();
  //   const body = {
  //     key: bulletKey
  //   };
  //   //todo; mark the key as deleted?
  //   //or delete thedatabase as well
  //   const response = await sendManagementUserRequest('createBulletKey',body)

  //   console.log(response.body);

  //   expect(response.status).toEqual(200);
  //   expect(response.body.data.key).toBeDefined();
  // });

  // test("close ", async () => {
  //   // await delay(1000);

  //   try {
  //     testUserMethods.stopServer();
  //   } catch (ex) {
  //     // console.log(ex);
  //   }
  // });
});

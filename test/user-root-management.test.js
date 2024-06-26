const request = require("supertest");
const server = require("../server");

// const { DEFAULT_USER, DEFAULT_DB_KEY } = require("../constants/constants");
const { delay, generateEmail, generatePassword } = require("./test-helpers");
const { TestUserMethods } = require("./methods/test-user-methods");
// require supertest

let startDate = 0;

const testUserMethods = new TestUserMethods(server, request);

describe("routes: user", () => {
  afterAll((done) => {
    try {
      testUserMethods.stopServer();
    } catch (ex) {
      // console.log(ex);
    }

    done();
  });

  let memoryData = {};

  test.skip("create root user ", async () => {
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
    expect(data.isrootuser).toEqual(true);
    expect(data.bulletKey).toBeDefined();
    // memoryData.rootUserResponse = data;
    testUserMethods.loggedUser = data;

    console.log(data);
  });

  test.skip("create another root user with the same email ", async () => {
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

  test.skip("delete root user ", async () => {
    // await delay(1000);

    startDate = new Date().getTime();

    const response = await testUserMethods.deleteAccount();

    const { body } = response;
    const { data } = body;

    expect(response.status).toEqual(200);
    expect(body.success).toEqual(true);

    console.log(data);
  });

  test("create  user withibn his own database ", async () => {
    // await delay(1000);

    startDate = new Date().getTime();
    const request = {
      email: generateEmail(),
      password: generatePassword(),
    };

    memoryData.rootUserRequest = request;

    const response = await testUserMethods.createUser(
      request,
      "claudiu_bullet_key"
    );

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
    memoryData.xxx = 1;
  });

  test("login user withibn his own database ", async () => {
    // await delay(1000);
    if (!memoryData.xxx) {
      debugger;
    }

    startDate = new Date().getTime();

    const response = await testUserMethods.loginUser(
      memoryData.rootUserRequest,
      "claudiu_bullet_key"
    );

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
});

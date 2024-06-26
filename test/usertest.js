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

const { DEFAULT_USER, DEFAULT_DB_KEY } = require("../constants/constants");
// require supertest

let defaultLoggedUser = null;
let loggedUser = null;

let startDate = 0;

const sendAnonymousUserRequest = async (method, data, key = DEFAULT_DB_KEY) => {
  const response = await request(server)
    .post(`/bulletapi/user/${method}`)
    .set("x_bullet_key", key)
    .send(data);
  return response;
};

const sendLoggedUserRequest = async (method, data) => {
  // const token = user ? user.token : '';
  // const x_bullet_key = loggedUser ? loggedUser.x_bullet_key || DEFAULT_DB_KEY : DEFAULT_DB_KEY;
  const response = await request(server)
    .post(`/bulletapi/logged-user/${method}`)
    .set("x_bullet_key", DEFAULT_DB_KEY)
    .set("authorization", loggedUser.token)
    .send(data);
  return response;
};

const sendManagementUserRequest = async (method, data) => {
  const token = defaultLoggedUser ? defaultLoggedUser.token : "";
  const response = await request(server)
    .post(`/bulletapi/private/management/${method}`)
    .set("x_bullet_key", DEFAULT_DB_KEY)
    .set("authorization", token)
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

  test("create default user ", async () => {
    await delay(1000);

    startDate = new Date().getTime();
    const body = {
      email: DEFAULT_USER.email,
      password: DEFAULT_USER.password,
    };

    const response = await sendAnonymousUserRequest("createUser", body);

    // console.log("a22", response.body);

    expect(response.status).toEqual(200);
  });

  test("login ", async () => {
    startDate = new Date().getTime();
    const body = {
      email: DEFAULT_USER.email,
      password: DEFAULT_USER.password,
    };

    const response = await sendAnonymousUserRequest("login", body);

    // console.log('a2233', response.body);

    defaultLoggedUser = response.body.data;

    // console.log(response.body);
    expect(response.status).toEqual(200);
    expect(response.body.success).toBeTruthy();
  });

  test("create user", async () => {
    await delay(1000);

    startDate = new Date().getTime();
    const body = {
      email: generateEmail(),
      password: generatePassword(),
    };

    const response = await sendAnonymousUserRequest("createUser", body);

    // console.log('hhh', response.body);
    expect(response.status).toEqual(200);
    expect(response.body.success).toBeTruthy();
  });

  test("create user and get token object", async () => {
    startDate = new Date().getTime();
    const body = {
      email: generateEmail(),
      password: generatePassword(),
    };

    const response = await sendAnonymousUserRequest("createUserAndLogin", body);

    loggedUser = response.body.data;

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeTruthy();
    expect(loggedUser.token).toBeDefined();

    // console.log("wwee", loggedUser);
  });

  test("add bullet key ", async () => {
    startDate = new Date().getTime();
    const body = {
      name: "bulettest",
      server: "mongodb://127.0.0.1:27017",
      database: "ppuu",
      tokenPassword: "jhgasjhgsjdhgjshdgjhagdjhg",
      tokenExpire: "3h",
    };

    const response = await sendManagementUserRequest("createBulletKey", body);

    expect(response.status).toEqual(200);
    expect(response.body.data.key).toBeDefined();

    // bulletKey = response.body.data.key;
    // loggedUser.x_bullet_key = bulletKey;
  });

  test("get bullet keys ", async () => {
    const response = await sendManagementUserRequest("getBulletKeys", {});

    expect(response.status).toEqual(200);
    expect(response.body.data.length).toBeGreaterThan(0);

    // bulletKey = response.body.data.key;
    // loggedUser.x_bullet_key = bulletKey;
  });

  test("confirm user", async () => {
    startDate = new Date().getTime();
    const body = {
      confirm: loggedUser.confirm || "",
    };

    const response = await sendAnonymousUserRequest("confirm", body);

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeTruthy();
    // expect(response.body.data.reset).toBeDefined();

    // loggedUser.reset = response.body.data.reset;/
  });

  test("confirm user no reset", async () => {
    startDate = new Date().getTime();
    const body = {
      confirm: "",
    };

    const response = await sendAnonymousUserRequest("confirm", body);

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeFalsy();
    expect(response.body.message).toEqual(USER_ERROR.RESET_EMPTY);
  });

  test("confirm user NON-existent reset", async () => {
    startDate = new Date().getTime();
    const body = {
      confirm: "asdasdasd",
    };

    const response = await sendAnonymousUserRequest("confirm", body);

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeFalsy();
    expect(response.body.message).toEqual(USER_ERROR.RESET_NOT_FOUND);
  });

  test("create user no email", async () => {
    startDate = new Date().getTime();
    const body = {
      email: "",
      password: generatePassword(),
    };

    const response = await sendAnonymousUserRequest("createUser", body);

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeFalsy();
    expect(response.body.message).toEqual("EMAIL_EMPTY");
  });

  test("create user no valid email", async () => {
    startDate = new Date().getTime();
    const body = {
      email: "aaa",
      password: generatePassword(),
    };

    const response = await sendAnonymousUserRequest("createUser", body);

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeFalsy();
    expect(response.body.message).toEqual("EMAIL_INVALID");
  });
  test("create user no password", async () => {
    startDate = new Date().getTime();
    const body = {
      email: generateEmail(),
      password: "",
    };

    const response = await sendAnonymousUserRequest("createUser", body);

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeFalsy();
    expect(response.body.message).toEqual("PASSWORD_EMPTY");
  });
  test("create user invalid password", async () => {
    startDate = new Date().getTime();
    const body = {
      email: generateEmail(),
      password: "aaa",
    };

    const response = await sendAnonymousUserRequest("createUser", body);

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeFalsy();
    expect(response.body.message).toEqual("PASSWORD_LENGTH_MIN");
  });

  test("forgot password no email", async () => {
    startDate = new Date().getTime();
    const body = {
      email: "",
    };

    const response = await sendAnonymousUserRequest("forgotPassword", body);

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeFalsy();
    expect(response.body.message).toEqual("EMAIL_EMPTY");
  });

  test("forgot password no existent user", async () => {
    startDate = new Date().getTime();
    const body = {
      email: generateEmail(),
    };

    const response = await sendAnonymousUserRequest("forgotPassword", body);

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeFalsy();
    expect(response.body.message).toEqual("USER_NOT_FOUND");
  });

  test("forgot password existent user ", async () => {
    startDate = new Date().getTime();
    const body = {
      email: loggedUser.email,
    };

    const response = await sendAnonymousUserRequest("forgotPassword", body);

    loggedUser.reset = response.body.data.reset;

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeTruthy();
    expect(response.body.data.reset).toBeDefined();
  });

  test("reset password existent user ", async () => {
    startDate = new Date().getTime();
    const body = {
      reset: loggedUser.reset,
      password: generatePassword(),
    };

    const response = await sendAnonymousUserRequest("resetPassword", body);

    // console.log(response.body);

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeTruthy();
    // console.log(response.body);
    // expect(response.body.message).toEqual(USER_ERROR.PASSWORD_CHANGED);
  });

  test("update user", async () => {
    startDate = new Date().getTime();
    const body = {
      a: 1,
    };

    const response = await sendLoggedUserRequest("update", body);

    // console.log(response.body);

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeTruthy();
    // console.log(response.body);
    expect(response.body.message).toEqual(USER_ERROR.USER_UPDATED);
  });

  test("change password existent user ", async () => {
    startDate = new Date().getTime();
    const body = {
      password: generatePassword(),
    };

    const response = await sendLoggedUserRequest("changePassword", body);

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeTruthy();
    expect(response.body.message).toEqual(USER_ERROR.PASSWORD_CHANGED);
  });

  test("inactivate ", async () => {
    startDate = new Date().getTime();
    const body = {
      password: generatePassword(),
    };

    const response = await sendLoggedUserRequest("inactivate", body);

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeTruthy();
  });

  test("activate", async () => {
    startDate = new Date().getTime();
    const body = {
      password: generatePassword(),
    };

    const response = await sendLoggedUserRequest("activate", body);

    expect(response.status).toEqual(200);
    expect(response.body.success).toBeTruthy();
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
});

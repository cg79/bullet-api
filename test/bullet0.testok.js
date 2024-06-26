/* eslint-disable no-plusplus */
/* eslint-disable no-console */
/* eslint-disable no-bitwise */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-undef */
/* eslint-disable func-names */
// require the Koa server
const request = require("supertest");
const server = require("../server");
// require supertest

function generateGuid() {
  function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  }

  // then to call it, plus stitch in '4' in the third group
  const guid = `${S4() + S4()}-${S4()}-4${S4().substr(
    0,
    3
  )}-${S4()}-${S4()}${S4()}${S4()}`.toLowerCase();
  return guid;
}

function generateEmail() {
  return `${generateGuid()}@test.com`;
}

function generatePassword() {
  return `pass -${generateGuid()}`;
}

function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const delay = (time = 1000) =>
  new Promise((resolve) => setTimeout(resolve, time));

let token = null;
let startDate = 0;

const sendBulletRequest = async (data) => {
  const response = await request(server)
    .post("/bulletapi/private/bullet")
    .set("authorization", token)
    .send(data);
  return response;
};

describe("routes: index", () => {
  afterAll((done) => {
    try {
      server.stop();
    } catch (ex) {
      // console.log(ex);
    }

    done();
  });
  test("create user used for tests", async () => {
    await delay(1000);

    startDate = new Date().getTime();
    const body = {
      email: generateEmail(),
      password: generatePassword(),
      sendEmail: false,
    };

    const response = await request(server)
      .post("/bulletapi/pub/security/createUser")
      .send(body);
    token = response.body.data.token;
    // console.log(token)
    // Logger.enabled = true;
    expect(response.status).toEqual(200);
  });

  test("insert one returns the _id ", async () => {
    const identifier = generateGuid();
    const guid = generateGuid();
    const xyz = randomIntFromInterval(1, 100);

    const body = {
      body: {
        identifier,
        guid,
        xyz,
      },
      name: "bullet",
      method: "insert",
    };

    const response = await sendBulletRequest(body);
    expect(response.status).toEqual(200);
    const insertedRecords = response.body.data;
    // console.log(insertedRecords);
    expect(insertedRecords._id).toBeDefined();
    // console.log(response.body.data);
  });

  test("insert followed by find flow with find criteria ", async () => {
    const guid = generateGuid();
    const xyzt = randomIntFromInterval(1, 100);
    const body = {
      body: {
        guid,
        xyzt,
      },
      bodyFields: {
        salt: {
          method: "generateSalt",
          module: "security",
        },
      },
      name: "bullet",
      method: "insert",
      flow: {
        name: "bullet",
        method: "findOne",
        find: {
          xyzt,
        },
      },
    };

    const response = await sendBulletRequest(body);
    // console.log('ddd' , response.body.data);
    expect(response.body.data.xyzt).toEqual(xyzt);
  });

  test("insert many returns the insertedIds ", async () => {
    const identifier = generateGuid();
    const records = [];
    for (let i = 0; i < 3; i++) {
      records.push({
        guid: generateGuid(),
        identifier,
      });
    }
    const body = {
      body: records,
      name: "bullet",
      method: "insert",
    };

    const response = await sendBulletRequest(body);
    expect(response.status).toEqual(200);
    const insertedRecords = response.body.data;
    // console.log(insertedRecords);
    expect(insertedRecords.insertedIds.length).toEqual(records.length);
    // console.log(response.body.data);
  });

  test("insert many returns the idsProp ", async () => {
    const identifier = generateGuid();
    const records = [];
    for (let i = 0; i < 3; i++) {
      records.push({
        guid: generateGuid(),
        identifier,
      });
    }
    const body = {
      body: records,
      name: "bullet",
      method: "insert",
      response: {
        key: "idsProp",
      },
    };

    const response = await sendBulletRequest(body);
    expect(response.status).toEqual(200);
    const insertedRecords = response.body.data;
    // console.log(insertedRecords);
    expect(insertedRecords.idsProp.length).toEqual(records.length);
    // console.log(response.body.data);
  });

  test("insert many returns empty object ", async () => {
    const identifier = generateGuid();
    const records = [];
    for (let i = 0; i < 3; i++) {
      records.push({
        guid: generateGuid(),
        identifier,
      });
    }
    const body = {
      body: records,
      name: "bullet",
      method: "insert",
      response: {
        ignore: true,
        key: "idsProp",
      },
    };

    const response = await sendBulletRequest(body);
    expect(response.status).toEqual(200);
    const data = response.body.data;
    // console.log(data);
    expect(Object.keys(data).length).toEqual(0);
    // console.log(response.body.data);
  });

  test("insert many by find flow with find criteria ", async () => {
    const identifier = generateGuid();
    const records = [];
    for (let i = 0; i < 2; i++) {
      records.push({
        guid: generateGuid(),
        identifier,
      });
    }
    const body = {
      body: records,
      name: "bullet",
      method: "insert",
      response: {
        ignore: true,
      },
      flow: {
        name: "bullet",
        method: "find",
        response: {
          key: "records",
        },
        find: {
          identifier,
        },
      },
    };

    const response = await sendBulletRequest(body);
    expect(response.status).toEqual(200);
    const insertedRecords = response.body.data;
    // console.log(insertedRecords);
    expect(insertedRecords.records.length).toEqual(records.length);
    // console.log(response.body.data);
  });

  test("pagination 1", async () => {
    const body = {
      name: "bullet",
      method: "page",
      page: {
        itemsOnPage: 2,
        pageNo: 1,
      },
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    expect(data.page.length).toEqual(2);
    // console.log('pagination 1', data);
  });

  test("pagination 2 - with sort", async () => {
    const body = {
      name: "bullet",
      method: "page",
      page: {
        itemsOnPage: 2,
        pageNo: 1,
      },
      sort: {
        x: 1,
      },
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    expect(data.page.length).toEqual(2);
    // console.log('pagination 2', data);
  });

  test("pagination 3 - with sort and find as expression", async () => {
    const body = {
      name: "bullet",
      method: "page",
      page: {
        itemsOnPage: 2,
        pageNo: 1,
      },
      sort: {
        x: 1,
      },
      find: {
        expression: "addedms > 1",
      },
      response: {
        aaa: "_id",
        identifier1: "identifier",
      },
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    // console.log('pagination 3', data);
    expect(data.page.length).toEqual(2);
  });

  test("pagination 4 - with sort and find as expression and response key", async () => {
    const body = {
      name: "bullet",
      method: "page",
      page: {
        itemsOnPage: 2,
        pageNo: 1,
      },
      sort: {
        x: 1,
      },
      find: {
        expression: "addedms > 1",
      },
      response: {
        aaa: "_id",
        identifier1: "identifier",
        key: "myPagination",
      },
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    // console.log('pagination 4', data);
    expect(data.myPagination.page.length).toEqual(2);
  });

  test("update one", async () => {
    const body = {
      body: {
        text: "--In 2005, Mozilla joined ECMA International, and work started on the ECMAScript ",
      },
      find: {
        expression: "addedms>2",
      },
      name: "bullet",
      method: "updateOne",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    // console.log('update one', data);
    // expect(data.length).toEqual(2);
  });

  test("update one by using no _id no body and no find", async () => {
    const body = {
      body: {
        text: "--In 2005, Mozilla joined ECMA International, and work started on the ECMAScript ",
        guid1: "364632e7-ead5-4f13-a3cb-8a52bfe5e706",
      },
      name: "bullet",
      method: "updateOne",
    };

    const response = await sendBulletRequest(body);
    // console.log('update one', response.body);
    expect(response.body.message).toEqual(
      "no find criteria and no _id and no guid"
    );
  });

  test("update one by using nobody.guid", async () => {
    const body = {
      body: {
        text: "--In 2005, Mozilla joined ECMA International, and work started on the ECMAScript ",
        guid: "364632e7-ead5-4f13-a3cb-8a52bfe5e706",
      },
      name: "bullet",
      method: "updateOne",
    };

    const response = await sendBulletRequest(body);
    // console.log('update one g', response.body);
    expect(response.body.data.ok).toEqual(1);
  });
  test("update one with no response", async () => {
    const body = {
      body: {
        text: "--In 2005, Mozilla joined ECMA International, and work started on the ECMAScript ",
      },
      find: {
        expression: "addedms>2",
      },
      response: {
        ignore: true,
      },
      name: "bullet",
      method: "updateOne",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    // console.log('update one', data);
    expect(data).toEqual({});
  });

  test("update one with key", async () => {
    const body = {
      body: {
        text: "--In 2005, Mozilla joined ECMA International, and work started on the ECMAScript ",
      },
      find: {
        expression: "addedms>2",
      },
      response: {
        key: "aaa",
      },
      name: "bullet",
      method: "updateOne",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    // console.log('update one key', data);
    expect(data.aaa.ok).toEqual(1);
  });

  test("update many", async () => {
    const body = {
      body: {
        text: "--In 2005, Mozilla joined ECMA International, and work started on the ECMAScript ",
      },
      find: {
        expression: "addedms>2",
      },
      name: "bullet",
      method: "updateMany",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    // console.log('update updateMany', data);
    // expect(data.length).toEqual(2);
  });

  test("update updateMany with no response", async () => {
    const body = {
      body: {
        text: "--In 2005, Mozilla joined ECMA International, and work started on the ECMAScript ",
      },
      find: {
        expression: "addedms>2",
      },
      response: {
        ignore: true,
      },
      name: "bullet",
      method: "updateMany",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    // console.log('update updateMany', data);
    expect(data).toEqual({});
  });

  test("update updateMany with key", async () => {
    const body = {
      body: {
        text: "--In 2005, Mozilla joined ECMA International, and work started on the ECMAScript ",
      },
      find: {
        expression: "addedms>2",
      },
      response: {
        key: "aaa",
      },
      name: "bullet",
      method: "updateMany",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    // console.log('update updateMany key', data);
    expect(data.aaa.ok).toEqual(1);
  });

  test("update one with increment", async () => {
    const identifier = generateGuid();
    const guid = generateGuid();
    const xyz = randomIntFromInterval(1, 100);

    const body = {
      body: {
        identifier,
        guid,
        xyz,
        y: 1,
      },
      name: "bullet",
      method: "insert",
      flow: [
        {
          body: {
            inc: { y: 1 },
          },
          find: { identifier },
          name: "bullet",
          method: "updateOne",
        },
        {
          find: { identifier },
          name: "bullet",
          method: "findOne",
        },
      ],
    };

    const response = await sendBulletRequest(body);

    const { data } = response.body;
    // console.log('update one with incrementy', data);
    expect(data.y).toEqual(2);
  });

  test("update one with increment - non existent field", async () => {
    const identifier = generateGuid();
    const guid = generateGuid();
    const xyz = randomIntFromInterval(1, 100);

    const body = {
      body: {
        identifier,
        guid,
        xyz,
        y: 1,
      },
      name: "bullet",
      method: "insert",
      flow: [
        {
          body: {
            inc: { notexistent: 1 },
          },
          find: { identifier },
          response: {
            ignore: 1,
          },
          name: "bullet",
          method: "updateOne",
        },
        {
          find: { identifier },
          name: "bullet",
          method: "findOne",
        },
      ],
    };

    const response = await sendBulletRequest(body);

    const { data } = response.body;
    // console.log('update one with incrementy', data);
    expect(data.notexistent).toEqual(1);
  });

  test("update one with increment and push", async () => {
    const identifier = generateGuid();
    const guid = generateGuid();
    const xyz = randomIntFromInterval(1, 100);
    const items = [
      {
        id: 1,
        name: "p1",
      },
    ];

    const body = {
      body: {
        identifier,
        guid,
        xyz,
        y: 1,
      },
      name: "bullet",
      method: "insert",
      flow: [
        {
          body: {
            inc: { y: 1 },
            push: {
              items,
            },
          },
          response: {
            ignore: true,
          },
          find: { identifier },
          name: "bullet",
          method: "updateOne",
        },
        {
          find: { identifier },
          name: "bullet",
          method: "findOne",
        },
      ],
    };

    const response = await sendBulletRequest(body);

    const { data } = response.body;
    // console.log('update one with incrementy and push', data);
    expect(data.y).toEqual(2);
    expect(data.items).toEqual(items);
  });

  test("update one with increment and push and expression", async () => {
    const identifier = generateGuid();
    const guid = generateGuid();
    const xyz = randomIntFromInterval(1, 100);
    const items = [
      {
        id: 1,
        name: "p1",
      },
    ];

    const body = {
      body: {
        identifier,
        guid,
        xyz,
        y: 1,
      },
      name: "bullet",
      method: "insert",
      flow: [
        {
          body: {
            inc: { y: 1 },
            push: {
              items,
            },
          },
          response: {
            ignore: true,
          },
          find: { identifier },
          name: "bullet",
          method: "updateOne",
        },
        {
          find: {
            expression: ` identifier == ${identifier}`,
          },
          name: "bullet",
          method: "findOne",
        },
      ],
    };

    const response = await sendBulletRequest(body);

    const { data } = response.body;
    // console.log('update one with incrementy and push', data);
    expect(data.y).toEqual(2);
    expect(data.items).toEqual(items);
  });

  test("update one nested array", async () => {
    const identifier = generateGuid();
    const guid = generateGuid();
    const xyz = randomIntFromInterval(1, 100);
    const grades = [
      { grade: 80, mean: 75, std: 8 },
      { grade: 85, mean: 90, std: 5 },
      { grade: 90, mean: 85, std: 3 },
    ];

    const body = {
      body: {
        identifier,
        guid,
        xyz,
        y: 1,
        grades,
      },
      name: "bullet",
      method: "insert",
      flow: [
        {
          find: {
            expression: `identifier == "${identifier}" && grades.std == 5`,
          },
          body: {
            set: {
              grades: { grade: 85, mean: 90, std: 50 },
            },
          },
          response: {
            ignore: true,
          },
          name: "bullet",
          method: "updateOne",
        },
        {
          find: {
            expression: ` identifier == ${identifier}`,
          },
          name: "bullet",
          method: "findOne",
        },
      ],
    };

    const response = await sendBulletRequest(body);

    const { data } = response.body;
    // console.log('update one with incrementy and push', data);
    expect(data.grades.find((el) => el.std === 50)).toEqual({
      grade: 85,
      mean: 90,
      std: 50,
    });
  });

  test("update one nested array --> push new item", async () => {
    const identifier = generateGuid();
    const guid = generateGuid();
    const xyz = randomIntFromInterval(1, 100);
    const grades = [
      { grade: 80, mean: 75, std: 8 },
      { grade: 85, mean: 90, std: 5 },
      { grade: 90, mean: 85, std: 3 },
    ];

    const body = {
      body: {
        identifier,
        guid,
        xyz,
        y: 1,
        grades,
      },
      name: "bullet",
      method: "insert",
      flow: [
        {
          find: {
            expression: `identifier == "${identifier}"`,
          },
          body: {
            push: {
              grades: { grade: 85, mean: 90, std: 501 },
            },
          },
          response: {
            ignore: true,
          },
          name: "bullet",
          method: "updateOne",
        },
        {
          find: {
            expression: ` identifier == ${identifier}`,
          },
          name: "bullet",
          method: "findOne",
        },
      ],
    };

    const response = await sendBulletRequest(body);

    const { data } = response.body;
    // console.log('update one with incrementy and push', data);
    expect(data.grades.find((el) => el.std === 501)).toEqual({
      grade: 85,
      mean: 90,
      std: 501,
    });
  });

  test("update one nested array --> remove elements from nested array", async () => {
    const identifier = generateGuid();
    const guid = generateGuid();
    const xyz = randomIntFromInterval(1, 100);
    const grades = [
      { grade: 80, mean: 75, std: 8 },
      { grade: 85, mean: 90, std: 5 },
      { grade: 90, mean: 85, std: 3 },
    ];

    const body = {
      body: {
        identifier,
        guid,
        xyz,
        y: 1,
        grades,
      },
      name: "bullet",
      method: "insert",
      flow: [
        {
          find: {
            expression: `identifier == "${identifier}"`,
          },
          body: {
            pull: {
              grades: { std: 5 },
            },
          },
          response: {
            ignore: true,
          },
          name: "bullet",
          method: "updateOne",
        },
        {
          find: {
            expression: ` identifier == ${identifier}`,
          },
          name: "bullet",
          method: "findOne",
        },
      ],
    };

    const response = await sendBulletRequest(body);

    const { data } = response.body;
    // console.log('update one with incrementy and push', data);
    expect(data.grades.find((el) => el.std === 5)).toBeUndefined();
  });

  test("find all without condition", async () => {
    const body = {
      name: "bullet_not_existent",
      method: "find",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    expect(data.length).toEqual(0);
  });

  test("find all with empty find onject", async () => {
    const body = {
      find: {},
      name: "bullet_not_existent",
      method: "find",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    expect(data.length).toEqual(0);
  });

  test("find with expression", async () => {
    const body = {
      find: {
        expression: "(x == 5 || x == 8) && (y>1)",
      },
      name: "bullet_not_existent",
      method: "find",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    expect(data.length).toEqual(0);
  });

  test("find with expression - field not exists or is 0", async () => {
    const body = {
      find: {
        expression: "_y1 || y1 == 0",
      },
      name: "bullet_not_existent",
      method: "find",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    expect(data.length).toEqual(0);
  });

  test("find with expression - nested `array contains elements", async () => {
    const body = {
      find: {
        "items.0": { $exists: true },
      },
      name: "bullet_not_existent",
      method: "find",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    expect(data.length).toEqual(0);
  });

  test("find regex", async () => {
    const body = {
      find: {
        regex: { text: "goal" },
      },
      name: "bullet_not_existent",
      method: "find",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    expect(data.length).toEqual(0);
  });

  test("find one custom fields", async () => {
    const body = {
      find: {
        expression: "xyz>2",
      },
      response: {
        idValue: "_id",
        guidValue: "guid",
      },
      name: "bullet",
      method: "findOne",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    expect(data.idValue).toBeDefined();
  });

  test("find one with join and custom fields", async () => {
    const body = {
      find: {
        expression: "xyz>2",
      },
      join: [
        {
          name: SYS_DBS.USERS,
          left: "userid",
          right: "_id",
          response: {
            email: "email",
            _id: "_id",
          },
        },
      ],
      name: "bullet",
      method: "findOne",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    // console.log('p1p1p1p2', data);
    expect(data.users.length).toEqual(1);
  });

  test("find one with join and custom fields and named response", async () => {
    const body = {
      find: {
        expression: "xyz>2",
      },
      join: [
        {
          name: SYS_DBS.USERS,
          left: "userid",
          right: "_id",
          response: {
            key: "myUsers",
            email: "email",
            _id: "_id",
          },
        },
      ],
      name: "bullet",
      method: "findOne",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    // console.log('p1p1p1p2', data);
    expect(data.myUsers.length).toEqual(1);
  });

  test("find many with join and custom fields and named response", async () => {
    const body = {
      find: {
        expression: "xyz>2",
      },
      response: {
        key: "bulletRecords",
      },
      join: [
        {
          name: SYS_DBS.USERS,
          left: "userid",
          right: "_id",
          response: {
            key: "myUsers",
            email: "email",
            _id: "_id",
          },
        },
      ],
      name: "bullet",
      method: "find",
    };

    const response = await sendBulletRequest(body);
    const { data } = response.body;
    // console.log('p1p1p1p2333', data);
    expect(data.myUsers.length).toBeGreaterThan(0);
  });

  test("execute flow only if stop condition is false", async () => {
    const body = {
      find: {
        guid: "something not existent1",
      },
      name: "bullet",
      method: "findOne",
      flow: {
        stop: {
          // expression: 'result == null',
          condition: "function start(response){return response === null} ",
        },
        errCode: "ERROR_THROWN",
        body: {
          guid: "364632e7-ead5-4f13-a3cb-8a52bfe5e706",
          x: 2,
        },
        name: "bullet",
        method: "insert",
      },
    };
    const response = await sendBulletRequest(body);
    const { data } = response.body;
    // console.log("xxxx", data);
    expect(data.message.code).toEqual("ERROR_THROWN");
  });

  test("execute flow only if stop condition is false", async () => {
    const body = {
      find: {
        guid: "something not existent1",
      },
      name: "bullet",
      method: "findOne",
      flow: {
        stop: {
          condition: "function start(response){return response !== null} ",
        },
        errCode: "ERROR_THROWN",
        body: {
          guid: "364632e7-ead5-4f13-a3cb-8a52bfe5e706",
          x: 2,
        },
        response: {
          _id: "_id",
          guid: "guid",
          x: "x",
        },
        name: "bullet",
        method: "insert",
      },
    };
    const response = await sendBulletRequest(body);
    const { data } = response.body;
    // console.log("xxxx1", data);
    expect(data.message.code).toEqual("ERROR_THROWN");
  });

  // find cu in sa mai fac un test
  test("bullet remove all records from test ", async () => {
    const body = {
      // find: {
      //   expression: ` addedms < ${startDate}`,
      // },
      name: "bullet",
      method: "deleteMany",
    };

    const response = await sendBulletRequest(body);
    expect(response.status).toEqual(200);
    // const insertedRecords = response.body.data;
    // console.log('uuu', insertedRecords);
    // console.log(response.body.data);
  });
});

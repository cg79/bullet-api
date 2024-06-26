/* eslint-disable no-plusplus */
/* eslint-disable no-console */
/* eslint-disable no-bitwise */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-undef */
/* eslint-disable func-names */
// require the Koa server
const request = require('supertest');
const USER_ERROR = require('../module/user/user-errors');
const server = require('../server');
const { guid } = require('../utils/utils');
const { DEFAULT_USER, DEFAULT_DB_KEY } = require('../constants/constants');
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

function randomIntFromInterval(min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const delay = (time = 1000) => new Promise((resolve) => setTimeout(resolve, time));

let defaultLoggedUser = null;

const sendUserRequest = async (method,data) => {
  const response = await request(server)
    .post(`/bulletapi/user/${method}`)
    .set('x_bullet_key', DEFAULT_DB_KEY)
    .send(data);
  return response;
};


const sendBulletRequest = async (data) => {
  const response = await request(server)
    .post('/bulletapi/private/bullet')
    .set('authorization', defaultLoggedUser.token)
    .set('x_bullet_key', DEFAULT_DB_KEY)
    .send(data);
  return response;
};

describe('routes: user', () => {
  afterAll((done) => {
    try {
      server.stop();
    } catch (ex) {
      // console.log(ex);
    }

    done();
  });

  test('login11 ', async () => {

    startDate = new Date().getTime();
    const body = {
      email: DEFAULT_USER.email,
      password: DEFAULT_USER.password,
    };

    const response = await sendUserRequest('login',body)

    // console.log('a2233', response.body);

    defaultLoggedUser = response.body.data;

    // console.log(response.body);
    expect(response.status).toEqual(200);
    expect(response.body.success).toBeTruthy();
  });

  test('insert one returns the _id ', async () => {
    const identifier = generateGuid();
    const guid = generateGuid();
    const xyz = randomIntFromInterval(1, 100);

    const body = {
      body: {
        identifier,
        guid,
        xyz,
      },
      name
        name: 'bullet',
        method: 'insert',
      }
      
    };

    const response = await sendBulletRequest(body);
    expect(response.status).toEqual(200);
    const insertedRecords = response.body.data;
    // console.log('asdasd1', response.body);
    expect(insertedRecords._id).toBeDefined();
    // console.log(response.body.data);
  });

  // test('insert followed by find flow with find criteria ', async () => {
  //   const guid = generateGuid();
  //   const xyzt = randomIntFromInterval(1, 100);
  //   const body = {
  //     body: {
  //       guid,
  //       xyzt,
  //     name
  //     inname
  //       collection: 'bullet',
  //       method: 'insert',
  //     },
  //     flow: {
  //       find: {
  //         xyzt,
  //       name
  //       inname
  //         collection: 'bullet',
  //         method: 'findOne',
  //       },
  //     },
  //   };

  //   const response = await sendBulletRequest(body);
  //   console.log('ddd' , response.body);
  //   expect(response.body.data.xyzt).toEqual(xyzt);
  // });


});

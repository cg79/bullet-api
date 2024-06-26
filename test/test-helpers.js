const { guid } = require("../utils/utils");
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

module.exports = {
  generateGuid,
  generateEmail,
  generatePassword,
  delay,
};

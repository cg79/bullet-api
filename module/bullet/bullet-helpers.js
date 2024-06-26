const validation = require("../validation/validation");
const mongoExpression = require("./expression/mongoExpression");
const { ObjectID } = require("mongodb");
const utils = require("../../utils/utils");

class BulletHelpers {
  getCollectionName(
    collectionObj = {},
    tokenObj,
    guid = "",
    throwError = true
  ) {
    const { name, useGuid, owned } = collectionObj;
    // if(name && throwError && name.indexOf('zsys-')>-1) {
    //   throw new Error('zsys- is a reserved prefix for system collections');
    // }
    if (owned) {
      return name + tokenObj._id.toString();
    }
    if (useGuid) {
      return name + guid;
    }

    return name;
  }

  moveObjToKey(key, obj) {
    if (!key) {
      return obj;
    }
    const resp = {};
    resp[key] = obj;

    return resp;
  }

  ensureFindExpression(find, body) {
    const { expression } = find;
    if (expression) {
      find = mongoExpression.createMongoQuery(expression);
    }

    this.checkFindId(find);
    this.checkRegex(find);
    this.checkIn(find);

    const newFind = this.createFindFromBody(find, body);
    return newFind;
  }

  checkFindId(find) {
    if (!find) {
      return;
    }
    if (find._id && typeof find._id === "string") {
      find._id = ObjectID(find._id);
    }
  }

  checkRegex(find) {
    const { regex } = find;
    if (!regex) {
      return;
    }
    Object.keys(regex).forEach((key) => {
      find[key] = { $regex: regex[key] };
    });

    delete find.regex;
  }

  checkIn(find) {
    const { in: inProp } = find;
    if (!inProp) {
      return;
    }
    Object.keys(inProp).forEach((key) => {
      find[key] = { $in: inProp[key] };
    });

    delete find.in;
  }

  createFindFromBody(find, body) {
    if (Object.keys(find).length) {
      return find;
    }
    const { _id, guid } = body;
    if (_id) {
      if (typeof _id === "string") {
        find._id = ObjectID(_id);
      }
      return find;
    }
    if (guid) {
      find.guid = guid;
      return find;
    }

    return find;
  }

  // createResponseFromArray(arr, take) {
  //   if (!take) {
  //     return arr;
  //   }
  //   const { key } = take;
  //   delete take.key;
  //   const newArr = arr.map((el) => this.createResult(el, take));
  //   if (key) {
  //     const temp = {};
  //     temp[key] = newArr;
  //     return temp;
  //   }
  //   return newArr;
  // }

  createPushDbObjSyntax(pushObj) {
    const dbPush = {};
    Object.keys(pushObj).forEach((key) => {
      if (Array.isArray(pushObj[key])) {
        dbPush[key] = { $each: pushObj[key] };
      } else {
        dbPush[key] = pushObj[key];
      }
    });

    return dbPush;
  }

  createPullDbObjSyntax(pullObj) {
    //{
    // pull: {
    // guid: [g1,g2,g3]
    //}
    // }
    const result = {};
    let val = null;
    Object.keys(pullObj).forEach((key) => {
      val = pullObj[key];
      if (Array.isArray(val)) {
        result[key] = { $in: val };
      } else if (typeof val === "object") {
        result[key] = this.createPullDbObjSyntax(val);
      } else {
        result[key] = val;
      }
    });
    return result;
  }

  createPullDbObjSyntax0(pullObj) {
    const dbPull = {};
    Object.keys(pullObj).forEach((key) => {
      if (Array.isArray(pullObj[key])) {
        dbPull[key] = { $in: pullObj[key] };
      } else {
        dbPull[key] = pullObj[key];
      }
    });

    return dbPull;
  }

  createSetSyntax(setObj) {
    const prop = Object.keys(setObj)[0];
    const resultProp = `${prop}.$`;
    const valuesObj = setObj[prop];

    const obj = {};
    Object.keys(valuesObj).forEach((key) => {
      obj[`${resultProp}.${key}`] = valuesObj[key];
    });
    return obj;
  }

  createIncPushPull(body) {
    const setCriteria = {};
    if (body.inc) {
      setCriteria.$inc = body.inc;
      delete body.inc;
    }
    const pushObj = body.push;
    if (pushObj) {
      setCriteria.$push = this.createPushDbObjSyntax(pushObj);
      delete body.push;
    }

    const pullObj = body.pull;
    if (pullObj) {
      setCriteria.$pull = this.createPullDbObjSyntax(pullObj);
      delete body.pull;
    }

    const setObj = body.set;
    if (setObj) {
      setCriteria.$set = this.createSetSyntax(setObj);
      delete body.set;
    }

    return setCriteria;
  }

  readSpecificFields(objOrRecords, take, key) {
    let temp = objOrRecords;
    if (take) {
      key = take.key || key;
      delete take.key;

      if (Array.isArray(objOrRecords)) {
        temp = objOrRecords.map((el) => this.createResult(el, take));
      } else {
        temp = this.createResult(objOrRecords, take);
      }
      // return temp;
    }

    if (key) {
      return this.moveObjToKey(key, temp);
    }

    return temp;
  }

  mergeObjects(a, b, flowName = "") {
    Object.keys(b).forEach((key, index) => {
      if (a[key]) {
        throw new Error(
          `${key} already exists for obj 1 for flow name ${flowName}`
        );
      } else {
        a[key] = b[key];
      }
    });
    return a;
  }

  copyFlowProps(bullet, destination) {
    const {
      body,
      collection,
      tokenObj,
      flow,
      bulletDataKey,
      koa_files,
      traceStart,
      traceEnd,
      executeflowByName,
      reqid,
      page,
      sort,
      response,
      merge,
    } = bullet;

    destination.tokenObj = tokenObj;
    destination.bulletDataKey = bulletDataKey;
    destination.reqid = reqid;

    // if (body) {
    //   destination.body = body;
    // }
    if (page) {
      destination.page = page;
    }
    if (sort) {
      destination.sort = sort;
    }
    if (response) {
      destination.response = response;
    }
    if (merge) {
      destination.merge = merge;
    }
    if (traceStart) {
      destination.traceStart = traceStart;
    }
    if (traceEnd) {
      destination.traceEnd = traceEnd;
    }
    if (koa_files) {
      destination.koa_files = koa_files;
    }

    return destination;
  }

  copyOnlyEssentialFlowProps(bullet, destination) {
    const { tokenObj, bulletConnection, reqid } = bullet;

    destination.tokenObj = tokenObj;
    destination.bulletConnection = bulletConnection;
    destination.reqid = reqid;

    return destination;
  }

  createResult(sourse, response) {
    if (!response) {
      return sourse;
    }

    if (!sourse) {
      return response.key
        ? {
            [response.key]: sourse,
          }
        : sourse;
    }
    let haveValue = false;
    let retValue = {};

    let { key, fields, run, include, exclude } = response;

    if (exclude) {
      this.exclude(sourse, exclude);
      return key
        ? {
            [key]: sourse,
          }
        : sourse;
    }

    if (fields) {
      haveValue = true;
      fields = fields.replace(/\s/g, ""); // remove spaces
      const allFields = fields.split(",");
      if (allFields.length === 1) {
        retValue = utils.readObjectValueByPath(sourse, allFields[0]);
      } else {
        allFields.forEach((field) => {
          retValue[field] = utils.readObjectValueByPath(sourse, field);
        });
      }
    }

    if (include) {
      haveValue = true;
      let keyValue = "";
      let temp = null;
      Object.keys(include).forEach((rKey) => {
        keyValue = include[rKey];
        if (typeof keyValue === "string") {
          retValue[rKey] = utils.readObjectValueByPath(sourse, keyValue);
        } else {
          temp = utils.readObjectValueByPath(sourse, keyValue.fields);
          this.exclude(temp, keyValue.exclude);
          retValue[rKey] = temp;
        }
      });
    }

    if (!haveValue) {
      retValue = sourse;
    }

    // const { ...otherKeys } = fieldsClone;
    // let { exclude } = fieldsClone;
    // if (exclude) {
    //   let excludedFields = [];

    //   if (typeof exclude === "string") {
    //     exclude = exclude.replace(/\s/g, ""); // remove spaces
    //     excludedFields = exclude.split(",");
    //     // allFields.forEach((rKey) => delete fieldsClone[rKey]);
    //   }
    //   delete fieldsClone.exclude;

    //   // const select = {};
    //   Object.keys(sourse).forEach((rKey) => {
    //     excludedFields.forEach((el) => delete sourse[el]);
    //     // select[rKey] = utils.readObjectValueByPath(sourse, rKey);
    //   });

    //   return sourse;
    // }

    // let result = {};

    // if (include) {
    //   if (Array.isArray(include)) {
    //     include.forEach((rKey) => {
    //       if (typeof myVar === "string") {
    //         result[rKey] = utils.readObjectValueByPath(sourse, rKey);
    //       } else {
    //         //it means it is a object {key, value}
    //         Object.keys(rKey).forEach((keyKey) => {
    //           result[keyKey] = utils.readObjectValueByPath(
    //             sourse,
    //             rKey[keyKey]
    //           );
    //         });
    //       }
    //     });
    //   } else {
    //     if (typeof myVar === "string") {
    //       result[include] = utils.readObjectValueByPath(sourse, include);
    //     } else {
    //       Object.keys(include).forEach((rKey) => {
    //         result[rKey] = utils.readObjectValueByPath(sourse, include[rKey]);
    //       });
    //     }
    //   }
    // }

    return key
      ? {
          [key]: retValue,
        }
      : retValue;
  }

  createResult_old(sourse, fields) {
    if (!fields) {
      return sourse;
    }

    if (!sourse) {
      return fields.key
        ? {
            [fields.key]: sourse,
          }
        : sourse;
    }

    if (typeof fields === "string") {
      fields = fields.replace(/\s/g, ""); // remove spaces
      const allFields = fields.split(",");
      if (allFields.length === 1) {
        return utils.readObjectValueByPath(sourse, allFields[0]);
      }

      const select = {};
      allFields.forEach((field) => {
        select[field] = utils.readObjectValueByPath(sourse, field);
      });
      return select;
    }
    // is object
    if (!Object.keys(fields).length) {
      return sourse;
    }

    this.exclude(sourse, fields.exclude);
    delete fields.exclude;

    if (!Object.keys(fields).length) {
      return sourse;
    }

    // const { ...otherKeys } = fieldsClone;
    // let { exclude } = fieldsClone;
    // if (exclude) {
    //   let excludedFields = [];

    //   if (typeof exclude === "string") {
    //     exclude = exclude.replace(/\s/g, ""); // remove spaces
    //     excludedFields = exclude.split(",");
    //     // allFields.forEach((rKey) => delete fieldsClone[rKey]);
    //   }
    //   delete fieldsClone.exclude;

    //   // const select = {};
    //   Object.keys(sourse).forEach((rKey) => {
    //     excludedFields.forEach((el) => delete sourse[el]);
    //     // select[rKey] = utils.readObjectValueByPath(sourse, rKey);
    //   });

    //   return sourse;
    // }

    // let result = {};

    // if (include) {
    //   if (Array.isArray(include)) {
    //     include.forEach((rKey) => {
    //       if (typeof myVar === "string") {
    //         result[rKey] = utils.readObjectValueByPath(sourse, rKey);
    //       } else {
    //         //it means it is a object {key, value}
    //         Object.keys(rKey).forEach((keyKey) => {
    //           result[keyKey] = utils.readObjectValueByPath(
    //             sourse,
    //             rKey[keyKey]
    //           );
    //         });
    //       }
    //     });
    //   } else {
    //     if (typeof myVar === "string") {
    //       result[include] = utils.readObjectValueByPath(sourse, include);
    //     } else {
    //       Object.keys(include).forEach((rKey) => {
    //         result[rKey] = utils.readObjectValueByPath(sourse, include[rKey]);
    //       });
    //     }
    //   }
    // }

    let result = {};
    let keyValue = "";
    let temp = null;
    Object.keys(fields).forEach((rKey) => {
      keyValue = fields[rKey];
      if (typeof keyValue === "string") {
        result[rKey] = utils.readObjectValueByPath(sourse, keyValue);
      } else {
        temp = utils.readObjectValueByPath(sourse, keyValue.fields);
        this.exclude(temp, keyValue.exclude);
        result[rKey] = temp;
      }
    });

    return result;
  }

  exclude(source, what) {
    if (!what) {
      return source;
    }

    const fields = what.replace(/\s/g, "").split(",");
    fields.forEach((el) => delete source[el]);

    // Object.keys(sourse).forEach((rKey) => {
    //   excludedFields.forEach((el) => delete sourse[el]);
    //   // select[rKey] = utils.readObjectValueByPath(sourse, rKey);
    // });
  }

  // checkBodyProps(flow, result) {
  //   const { bodyProps } = flow;
  //   if (!bodyProps) {
  //     return result;
  //   }
  //   const tempProps = this.createResult(result, bodyProps);
  //   const body = flow.body || {};

  //   result = {
  //     ...body,
  //     ...tempProps,
  //   };

  //   return result;
  //   // flow.body = tempProps;
  // }

  validateConstraints(bulletDataKey, name, body) {
    if (!bulletDataKey.constraints) {
      return;
    }
    const constraint = bulletDataKey.constraints[name];
    if (!constraint) {
      return;
    }
    const validationResult = validation.startValidateConstraints(
      body,
      constraint
    );
    if (validationResult) {
      throw validationResult;
    }
  }
}

module.exports = new BulletHelpers();

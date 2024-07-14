const { ObjectId } = require("mongodb");

class MongoMethods {
  checkId(obj) {
    if (typeof obj._id === "string") {
      obj._id = ObjectId(obj._id);
    }
  }

  //---------------------
  async findOne(collection, criteria) {
    const doc = await collection.findOne(criteria);
    return doc;
  }

  async find(collection, criteria = {}, sort = null) {
    if (!sort) {
      return await collection.find(criteria).toArray();
    }

    return await collection.find(criteria).sort(sort).toArray();
  }

  async findOneById(collection, id) {
    const _id = typeof id === "string" ? ObjectId(id) : id;
    const doc = await collection.findOne({ _id });
    return doc;
  }

  async findById(collection, id) {
    const _id = typeof id === "string" ? ObjectId(id) : id;
    const doc = await collection.findOne({ _id });
    return doc;
  }

  async insertMany(collection, body) {
    const doc = await collection.insert(body);
    return { insertedIds: doc.insertedIds };
  }

  async insertOne(collection, body) {
    const doc = await collection.insertOne(body);
    return { _id: doc.insertedId, ...body };
  }

  async updateOne(collection, find, body) {
    // const setCriteria = { $set: body };
    // const setCriteria = body.$set ? body : { $set: body };
    try {
      const doc = await collection.updateOne(find, body);
      return doc;
    } catch (err) {
      console.log(err);
      debugger;
    }
  }

  async updateMany(collection, find, body) {
    // const setCriteria = { $set: body };
    // const setCriteria = body.$set ? body : { $set: body };
    try {
      const doc = await collection.updateMany(find, body);
      return doc;
    } catch (err) {
      console.log(err);
      debugger;
    }
  }

  async updateOneById(collection, id, body) {
    const _id = typeof id === "string" ? ObjectId(id) : id;
    delete body._id;
    // const setCriteria = body.$set ? body : { $set: body };
    try {
      const doc = await collection.updateOne({ _id }, body);
      return doc;
    } catch (err) {
      console.log(err);
      debugger;
    }
  }

  async deleteMany(collection, find) {
    const doc = await collection.deleteMany(find);
    return doc;
  }

  async deleteOne(collection, find) {
    const doc = await collection.deleteOne(find);
    return doc;
  }

  async deleteOneById(collection, id) {
    const _id = typeof id === "string" ? ObjectId(id) : id;
    const doc = await collection.deleteOne({ _id });
    return doc;
  }
}

const mongoMethods = new MongoMethods();
module.exports = mongoMethods;

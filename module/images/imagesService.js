const MongoQuery = require("../../utils/mongoQuery");
const { ObjectID } = require("mongodb");
const coreUtils = require("../../utils/core.utils")();
const fs = require("fs");
const path = require("path");
const Logger = require("../../utils/logger");

const docName = "images";

// class Image {

//   constructor(obj) {

//   }
// }

class ImagesService {
  async getFiles(data) {
    const { entityId } = data;
    const record = await MongoQuery.name(docName).findOne({
      entityId,
    });
    return record;
  }

  async addFiles(data) {
    Logger.log(data);

    const { entityId, deletedFiles, replacedFiles } = data;
    // const { _id, filePath, title, desc } = data;
    const { files } = data;
    const { list } = files;
    if (!list || !list.length) {
      return files;
    }
    const record = await MongoQuery.name(docName).findOne({
      entityId,
    });
    if (record) {
      //
      const dbFiles = record.files;
      const dbFileList = dbFiles.list;

      const appDir = path.dirname(require.main.filename);

      // Logger.log(files);

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const existentFile = dbFiles.find((el) => el._id === file._id);
        if (!existentFile) {
          dbFiles.push(file);
        } else if (replacedFiles && replacedFiles.length) {
          const replacedFile = replacedFiles.find(
            (el) => el._id == existentFile._id
          );
          if (replacedFile) {
            existentFile.originalFileName = file.filePath;
            existentFile.filePath = file.filePath;
            this.deleteFile(appDir, replacedFile.originalFileName);
          }
        }
      }

      let newDbFiles = dbFiles;
      if (deletedFiles && deletedFiles.length) {
        deletedFiles.forEach((el) => {
          newDbFiles = newDbFiles.filter((dbF) => dbF._id !== el._id);
          this.deleteFile(appDir, el.originalFileName);
        });
      }

      newDbFiles.forEach((el, index) => (el.index = index));

      await MongoQuery.name(docName).update(
        {
          entityId,
        },
        {
          $set: {
            files: newDbFiles,
          },
        }
      );
      return { files: newDbFiles };
    }
    await MongoQuery.name(docName).insert(data);
    return { files };
  }

  async setImageForEntity(data) {
    Logger.log(data);

    const {
      collectionName,
      collectionId,
      files,
      filePath, // old filepath
    } = data;
    if (!collectionName || !files.length) {
      return null;
    }
    const appDir = path.dirname(require.main.filename);
    const findCriteria = {
      _id: new ObjectID(collectionId),
    };
    const setCriteria = {
      $set: {
        file: files[0],
      },
    };

    const dbMessages = await MongoQuery.name(collectionName).update(
      findCriteria,
      setCriteria
    );

    this.deleteFile(appDir, filePath);
    return files[0];
  }

  async deleteFile(baseDir, filePath) {
    if (!filePath) {
      return;
    }
    try {
      const fileLocation = path.join(baseDir, filePath);
      fs.unlinkSync(fileLocation);
    } catch (err) {
      console.error(err);
    }
  }

  async update(data) {
    const { _id, files } = data;
    // const { _id, filePath, title, desc } = data;

    const dbMessages = await MongoQuery.name(docName).update(
      {
        _id: new ObjectID(_id),
      },
      {
        $set: {
          files,
        },
      }
    );
    return dbMessages;
  }

  async addReplyMessage(data) {
    const { _id, id, message } = data;

    const findCriteria = {
      _id: ObjectID(_id),
    };

    const itemId = coreUtils.uuid();
    const setCriteria = {
      $push: {
        items: {
          id: itemId,
          date: new Date(),
          message: message || "",
          read: false,
          parentId: id,
        },
      },
    };

    const dbMessages = await MongoQuery.name("messages").update(
      findCriteria,
      setCriteria,
      {
        upsert: true,
      }
    );

    const updateFilter = {
      _id: ObjectID(_id),
      "items.id": id,
    };

    const updateCriteria = {
      $push: {
        "items.$.msgs": itemId,
      },
    };

    Logger.log(updateFilter);
    const updateResult = await MongoQuery.name("messages").update(
      updateFilter,
      updateCriteria,
      false
    );

    return {
      dbMessages,
      updateResult,
    };
  }

  // {
  //   "proxy":{
  //     "method":"findItemsForParent",
  //     "module": "messages"
  //   },
  //   "data":{
  //     "message" :"salut",
  //     "email":"test@tes1t.com",
  //     "title" :"ttt",
  //     "_id":"5b0d6512752717bcd30afeef",
  //     "parentId": "848d0951-f153-a413-56f9-65e7e3acf302"
  //   }
  //  }
  async findItemsForParent(data) {
    const { _id, parentId } = data;

    const findCriteria = {
      _id: ObjectID(_id),
      "items.message": "salut1",
    };

    const selection = {
      items: {
        $elemMatch: {
          $eq: {
            "items.message": "salut1",
          },
        },
      },
    };
    // const dbMessages = await MongoQuery.name('messages').aggregate(
    //   { $match: {_id: ObjectID(_id) }},
    //   { $unwind: '$items'},
    //   { $match: {'items.status':1}}).toArray();

    // const dbMessages =  await MongoQuery.name('messages').find(
    //   { 'items.title': 'salut1'},
    // { 'items.$': 1 });

    // return dbMessages;

    const agg = [];
    agg.push({
      $match: {
        _id: ObjectID(_id),
      },
    });

    const projection = {};
    projection.$project = {
      items: {
        $filter: {
          input: "$items",
          as: "item",
          cond: {
            $eq: ["$$item.parentId", parentId],
          },
        },
      },
    };
    agg.push(projection);

    const dbMessages = await MongoQuery.name("messages")
      .aggregate(agg)
      .toArray();
    return dbMessages;
  }
}

module.exports = new ImagesService();

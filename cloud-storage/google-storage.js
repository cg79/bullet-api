const { Storage } = require("@google-cloud/storage");
const fs = require("fs-extra");
// const path = require("path");
// const errorService = require("../../errors/errors-service");

const createStorageInstance = (iamJsonFilePath) => {
  // keyFilename: "./cloud-storage/keys/fullsd-1575552276297-11a32fcb1f86.json",
  if (!fs.existsSync(iamJsonFilePath)) {
    //file exists
    throw new Error(
      "please set the storage json key for bucket (from dashboard/keys app)"
    );
  }
  const storage = new Storage({
    keyFilename: iamJsonFilePath,
  });
  return storage;
};

// const createStorageInstance = () => {
//     const storage = new Storage({
//         keyFilename: "./cloud-storage/keys/fullsd-1575552276297-11a32fcb1f86.json",
//         projectId: ' southern-silo-328309',
//     });
//     return storage;
// }

const getBucketByNameFromGoogleStorageInstance = (storage, bucketName) => {
  const bucket = storage.bucket(bucketName);
  return bucket;
};

const getBulletByUsingBulletStorage = (bulletStorage) => {
  const { bucket: bucketName, bulletKey, googleStorage } = bulletStorage;
  const iamJsonFilePath = `./uploads/${bulletKey}/${googleStorage.keyfilename}`;

  const googleStorageInstance = createStorageInstance(iamJsonFilePath);

  const googleBucket = getBucketByNameFromGoogleStorageInstance(
    googleStorageInstance,
    bucketName
  );

  return googleBucket;
};

async function deleteGoogleStorageFiles(appdir, bulletStorage) {
  if (!bulletStorage) {
    return;
  }

  const { deletedFiles, bucket } = bulletStorage;
  if (!deletedFiles || !deletedFiles.length) {
    return;
  }

  const googleBucket = getBulletByUsingBulletStorage(bulletStorage);

  try {
    for (let i = 0; i < deletedFiles.length; i++) {
      // const fileLocation = path.join(
      //   appdir,
      //   UPLOADS,
      //   bucket,
      //   deletedFiles[i].name
      // );
      const fileLocation = deletedFiles[i].name;

      try {
        const response = await googleBucket.file(fileLocation).delete();
      } catch (ex) {
        console.log("error deleting file ", deletedFiles[i], ex);
      }
      // if (fs.existsSync(fileLocation)) {
      //   fs.unlinkSync(fileLocation);
      // }
    }
  } catch (err) {
    // console.log("deleteGoogleStorageFiles error", err);
    throw err;
  }
}

const createBucket = async (options = {}) => {
  const { name } = options;
  const response = await storage.createBucket(name);
  return response;
};

// const deleteFileOrFolder = async (options = {}) => {
//   const { name } = options;

//   const bucketName = "fullsd-bucket1";
//   const storage = createStorageInstance();
//   const bucket = getBucketByNameFromGoogleStorageInstance(storage, bucketName);
//   const response = await bucket.file(name).delete();
//   return response;
// };

// async function makeBucketPublic(options) {
//   const { name } = options;

//   const storage = createStorageInstance();
//   const bucket = getBucketByNameFromGoogleStorageInstance(storage, name);

//   await bucket.makePublic();

//   console.log(`Bucket ${name} is now publicly readable`);
// }

const uploadImageToGCS = (file, storage, name) => {
  // makeBucketPublic({name:'fullsd-bucket1'});

  const { bucket: bucketName } = storage;
  return new Promise((resolve, reject) => {
    // const bucketName = "fullsd-bucket1";
    //const iamJsonFilePath = `./cloud-storage/keys/${storage.googleStorage.keyfilename}`;

    try {
      const iamJsonFilePath = `./uploads/${storage.bulletKey}/${storage.googleStorage.keyfilename}`;

      const googleStorageInstance = createStorageInstance(iamJsonFilePath);

      const bucket = getBucketByNameFromGoogleStorageInstance(
        googleStorageInstance,
        bucketName
      );

      let fileName = name || file.name || utils.guid();
      // const { name } = file;

      const reader = fs.createReadStream(file.path);
      reader.on("end", () => {
        //
      });
      reader.on("error", (err) => {
        // console.log(err);
        reject(err);
      });

      const blob = bucket.file(fileName);
      const blobStream = blob.createWriteStream({
        resumable: false,
      });
      blobStream
        .on("finish", async (data) => {
          // const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          //const publicUrl =  `https://storage.cloud.google.com/${bucket.name}/${blob.name}`;

          const filePath = `${bucket.name}/${blob.name}`;

          resolve(filePath);
        })
        .on("error", (ex) => {
          reject(ex);
        });

      reader.pipe(blobStream);
    } catch (ex) {
      // console.log("uploadImageToGCS error ", ex);
      reject(ex);
    }
  });
};

module.exports = {
  uploadImageToGCS,
  createBucket,
  // deleteFileOrFolder,
  // makeBucketPublic,

  deleteGoogleStorageFiles,
};

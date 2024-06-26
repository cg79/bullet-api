// const formidable = require('formidable');
const utils = require("../utils/utils");
const path = require("path");
const fs = require("fs-extra");
const {
  uploadImageToGCS,
  deleteGoogleStorageFiles,
} = require("../cloud-storage/google-storage");
const errorService = require("../errors/errors-service");

const UPLOADS = "uploads";

//delete file from google bucket
//https://stackoverflow.com/questions/65386409/google-cloud-storage-delete-file-in-a-specific-path-node-js
// https://stackoverflow.com/questions/54959059/google-cloud-storage-nodejs-how-to-delete-a-folder-and-all-its-content
function createDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

function checkUploadDirectory(bucket) {
  const appDir = path.dirname(require.main.filename);

  // let absolutePath = `/${UPLOADS}`;
  const baseDirectory = path.join(appDir, UPLOADS);
  createDir(baseDirectory);

  let dirPath = baseDirectory;

  if (bucket) {
    const directories = bucket.split(path.sep);

    for (let i = 0; i < directories.length; i++) {
      // dirPath = `${dirPath}/${directories[i]}`;
      dirPath = path.join(dirPath, directories[i]); // `${dirPath}/${directories[i]}`;

      // absolutePath = `${absolutePath}/${directories[i]}`;
      createDir(dirPath);
    }
  }
}

async function deleteLocalFiles(appdir, storage) {
  if (!storage) {
    return;
  }
  const { deletedFiles, bucket } = storage;
  if (!deletedFiles || !deletedFiles.length) {
    return;
  }
  try {
    for (let i = 0; i < deletedFiles.length; i++) {
      const fileLocation = path.join(
        appdir,
        UPLOADS,
        bucket,
        deletedFiles[i].name
      );
      if (fs.existsSync(fileLocation)) {
        fs.unlinkSync(fileLocation);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// storage
async function saveFiles(files, storage = {}, tokenObj) {
  let response = null;

  const errorFunction = (err) => 1;
  // errorService.writeErrorToDb(err, {}, tokenObj);

  const { provider = "local" } = storage;

  if (provider === "google") {
    if (!bulletDataKey) {
      throw new Error("no bullet data key");
    }
    storage.googleStorage = bulletDataKey.googleStorage;
    storage.bulletKey = bulletDataKey.guid;

    try {
      response = await persistFiles(
        files,
        storage,
        uploadImageToGCS,
        deleteGoogleStorageFiles,
        errorFunction
      );
    } catch (ex) {
      // console.log("exception on persistFiles", ex);
      errorFunction(ex);
      throw ex;
    }

    return response;
  }

  if (provider === "local") {
    const baseDirectory = tokenObj.clientId;
    if (baseDirectory) {
      storage.bucket = path.join(baseDirectory, storage.bucket); // bucket means directory in this case
    }
    response = await persistFiles(
      files,
      storage,
      saveFileToLocalHdd,
      deleteLocalFiles,
      errorFunction
    );

    return response;
  }

  return response;
}

serverDirecory = "";
function getServerDirectory() {
  if (serverDirecory) {
    return serverDirecory;
  }
  serverDirecory = path.dirname(require.main.filename);
  return serverDirecory;
}

async function persistFiles(
  files,
  storage,
  saveFileFct,
  deleteFilesFunction,
  errorFunction
) {
  let response = {
    dir: "",
    files: [],
  };
  const appDir = getServerDirectory();
  if (deleteFilesFunction) {
    await deleteFilesFunction(appDir, storage);
  }

  const { bucket = "", useKey = false } = storage;
  // const dir = bucket ?  path.join(UPLOADS,bucket)  : UPLOADS;
  response = {
    useKey,
    bucket,
    list: [],
  };
  if (storage.provider == "local") {
    checkUploadDirectory(bucket);
  }

  let fKey = "";
  let fileName = "";
  let fileValue = null;
  const fileKeys = Object.keys(files);

  for (let i = 0; i < fileKeys.length; i++) {
    fKey = fileKeys[i];
    fileValue = files[fKey];
    try {
      fileName = await saveFileFct(fileValue, storage, fKey, errorFunction);
    } catch (ex) {
      errorFunction(ex);
      // console.log("error on persist files ", ex);
    }

    if (useKey) {
      response.list.push({
        key: fKey,
        data: { name: fileName, size: fileValue.size },
      });
    } else {
      response.list.push({ name: fileName, size: fileValue.size });
    }
  }

  return response;
}

async function saveFileToLocalHdd(file, storage, name, errorFunction) {
  return new Promise((resolve, reject) => {
    const { bucket = "", keepFileName = true } = storage;

    let fileName = name || file.name || utils.guid();
    if (!keepFileName) {
      const fileExt = fileName.split(".").pop();
      fileName = `${utils.guid()}.${fileExt}`;
    }

    const reader = fs.createReadStream(file.path); // Create a readable stream

    const upStream = fs.createWriteStream(
      path.join(UPLOADS, bucket, fileName)
      // `${UPLOADS}/${bucket}/${fileName}`,
    );
    reader.on("end", () => resolve(fileName));
    reader.on("error", (err) => {
      // console.log(err);
      errorFunction(err);
    });

    // upStream.on('end', (err) => {
    //   console.log(err);
    //
    // });
    // upStream.on('error', (err) => {
    //   console.log(err);
    //
    // });
    reader.pipe(upStream);
  });
}

// function formidablePromise(req, opts) {
//   return new Promise(async (resolve, reject) => {
//     const form = new formidable.IncomingForm(opts);
//     const appDir = path.dirname(require.main.filename);

//     const newFileNames = [];

//     const uploadDirectory = 'uploads';

//     let absolutePath = `/${uploadDirectory}`;
//     const baseDirectory = appDir + absolutePath;
//     createDir(baseDirectory);

//     let dirPath = baseDirectory;

//     const { dir } = opts;
//     if (dir) {
//       const directories = dir.split('/');
//       for (let i = 0; i < directories.length; i++) {
//         dirPath = `${dirPath}/${directories[i]}`;
//         absolutePath = `${absolutePath}/${directories[i]}`;
//         createDir(dirPath);
//       }
//     }

//     form.uploadDir = dirPath;
//     if (!fs.existsSync(form.uploadDir)) {
//       fs.mkdirSync(form.uploadDir);
//     }
//     form.keepExtensions = true;

//     form.on('fileBegin', (fileData, file) => {
//       const x = fileData.split(',');
//       const parsedFileData = {
//         _id: x[0],
//         status: x[1],
//       };
//       const { _id } = parsedFileData;

//       const fileExt = file.name.split('.').pop();
//       const newFileName = `${utils.guid()}.${fileExt}`;
//       const index = newFileNames.length;

//       newFileNames.push({
//         _id,
//         index,
//         originalFileName: file.name,
//         newFileName,
//         filePath: `${absolutePath}/${newFileName}`,
//       });

//       file.path = `${dirPath}/${newFileName}`;
//     });

//     form.parse(req, (err, fields, files) => {
//       if (err) return reject(err);
//       resolve({ fields, files, newFileNames });
//     });
//   });
// }

// function documentPromise(req, opts) {
//   console.log('opts');
//   console.log(opts);
//   return new Promise(async (resolve, reject) => {
//     const form = new formidable.IncomingForm(opts);
//     const appDir = path.dirname(require.main.filename);

//     const uploadDirectory = 'uploads';
//

//     let absolutePath = `/${uploadDirectory}`;
//     const baseDirectory = appDir + absolutePath;
//     createDir(baseDirectory);

//     let dirPath = baseDirectory;

//     const { dir } = opts;
//     if (dir) {
//       const directories = dir.split('/');
//       for (let i = 0; i < directories.length; i++) {
//         dirPath = `${dirPath}/${directories[i]}`;
//         absolutePath = `${absolutePath}/${directories[i]}`;
//         createDir(dirPath);
//       }
//     }

//     form.uploadDir = dirPath;
//     if (!fs.existsSync(form.uploadDir)) {
//       fs.mkdirSync(form.uploadDir);
//     }
//     form.keepExtensions = true;

//     form.on('fileBegin', (fileData, file) => {
//       console.log(fileData);
//       const x = fileData.split(',');

//       file.path = `${dirPath}/${file.name}`;
//     });

//     form.parse(req, (err, fields, files) => {
//       if (err) return reject(err);
//       resolve({ fields, files });
//     });
//   });
// }

// async function saveFilesToLocalDrive(files, storage) {
//   let response = {
//     dir: '',
//     files: [],
//   };
//   const appDir = path.dirname(require.main.filename);
//   deleteLocalFiles(appDir, storage);

//   try {
//     const { bucket = '', useKey = false } = storage;
//     const dir = bucket ?  path.join(UPLOADS,bucket)  : UPLOADS;
//     response = {
//       useKey,
//       dir,
//       list: [],
//     };
//     checkUploadDirectory(dir);

//     let fKey = '';
//     const fileKeys = Object.keys(files);
//     for (let i = 0; i < fileKeys.length; i++) {
//       fKey = fileKeys[i];
//       const fileName = await saveFile(files[fKey], storage);
//       if (useKey) {
//         response.list.push({
//           key: fKey,
//           name: fileName,
//         });
//       } else {
//         response.list.push(fileName);
//       }
//     }
//   } catch (ex) {
//     console.log(ex);
//   }

//   return response;
// }

// module.exports.formidablePromise = (req, opts) => formidablePromise(req, opts);
// module.exports.documentPromise = (req, opts) => documentPromise(req, opts);

module.exports.saveFiles = saveFiles;

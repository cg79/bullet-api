
const utils = require('../utils/utils');
const path = require('path');
const fs = require('fs-extra');
const Logger = require('../utils/logger');

class CanvasFile {

    saveCanvasFilesToDisk(directory, canvasContent) {
        const appDir = __basedir;

        const newFileNames = [];

        const uploadDirectory = 'uploads';
        let relativePath = `/${uploadDirectory}`;
        
        let baseDirectory = path.join(appDir, uploadDirectory);
        this.createDir(baseDirectory);

        let fileDirectory = baseDirectory;

        const directories = directory.split('/');
        for (let i = 0; i < directories.length; i++) {

            this.createDir(path.join(baseDirectory, directories[i]));
            relativePath =  relativePath + `/${directories[i]}`;
            fileDirectory = path.join(fileDirectory, directories[i]);
        }

        Object.keys(canvasContent).forEach(file => {
            const fileExt = file.split('.').pop();
            const newFileName = `${utils.guid()}.${fileExt}`;
            const filePath = `${relativePath}/${newFileName}`;

            const filePathAndName  = path.join(fileDirectory, newFileName);
            this.saveCanvasToDirectory(filePathAndName, canvasContent[file]);
            newFileNames.push({
                _id,
                index,
                originalFileName: file,
                newFileName,
                filePath
            });

        });

        return newFileNames;
    }

    createDir(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }

    saveCanvasToDirectory(filePathAndName, content) {
        fs.writeFile(filePathAndName, content, (err) => {
            if (err) Logger.log(err);
            Logger.log("Successfully Written to File.");
        });
    }
}

module.exports = new CanvasFile();

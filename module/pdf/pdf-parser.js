const fs = require("fs");
const PDFParser = require("pdf2json");

var datePattern = /^\d{2}\/\d{2}\/\d{4}$/;

const modes = {
  START_WITH_RECORDS: "start_with_records",
  END_WITH_RECORDS: "end_with_records",
  TRANSACTION_DATE: "transaction_date",
};

function isNumber(input) {
  // console.log(input);
  // Check if the input is a valid number
  const wCommaValue = input.replace(",", ""); // remove comma value

  if (!wCommaValue.match(/^-?\d*\.?\d+$/)) {
    return 0;
  }

  // console.log(input, wCommaValue);
  const response = !isNaN(parseFloat(wCommaValue)); // && isFinite(input);
  if (response) {
    return parseFloat(wCommaValue);
  }
  return 0;
}

function dateStringToEpoch(dateString) {
  // Split the date string into month, day, and year
  const [day, month, year] = dateString.split("/");

  // Create a new Date object with the specified date components
  const date = new Date(year, month - 1, day);

  // Get the epoch timestamp by converting the date to milliseconds since Unix epoch
  const epoch = date.getTime() / 1000;

  return epoch;
}

const parsePdfData = (pdfData) => {
  let mode = null;
  let transaction = null;
  let transactions = [];
  let index = 0;
  let description = "";
  const result = [];
  pdfData.Pages.forEach((page) => {
    page.Texts.forEach((textElement) => {
      textElement.R.forEach((element) => {
        const response = decodeURI(element.T)
          .replace(/%2C/g, ",")
          .replace(/%2F/g, "/")
          .replace(/%3B/g, ";")
          .trimStart();

        if (mode === modes.TRANSACTION_DATE) {
          index++;

          // console.log(index, " ", response);
          const nValue = isNumber(response);
          if (nValue) {
            console.log("ESTE UN NUMAR ", description);
            const info = {
              operationid: 0,
              operationDescription: "",
            };
            description = description.toLowerCase();
            if (
              description.startsWith("comision plata") ||
              description.startsWith("nota contabila individuala")
            ) {
              info.operationid = 10; //comision tranzactie
              info.operationDescription = "comision tranzactie";
            }
            if (description.startsWith("incasare op")) {
              info.operationid = 1; //intrare bani
              info.operationDescription = "Intrare bani";
            }

            if (description.startsWith("comision incasare")) {
              info.operationid = 12; //comision incasare
              info.operationDescription = "Comision incasare";
            }
            if (description.startsWith("incasare instant")) {
              info.operationid = 2; //intrare salar (contine TVA)
              info.operationDescription = "Intrare salar";
              info.showDateFactura = true;
            }
            if (description.startsWith("clasificare bt")) {
              info.operationid = 12; //comision incasare
              info.operationDescription = "Comision incasare";
            }
            if (description.includes("ro32trez21620a100101xtva")) {
              info.operationid = 4; //intrare salar (contine TVA)
              info.operationDescription = "Plata TVA";
            }

            if (description.startsWith("plata la pos")) {
              info.operationid = 3; //intrare salar (contine TVA)
              info.operationDescription = "Cumparare cu Deducere TVA";
              info.maybe = [13, 9];
            }

            if (description.includes("ro13ugbi0000042031518ron")) {
              if (description.includes("salar")) {
                info.operationid = 5; // plata salar
                info.operationDescription = "Plata salar";
              } else {
                info.operationid = 9; // transfer cont personal
                info.operationDescription = "transfer cont personal";
              }
            }
            if (description.startsWith("pachet izi")) {
              info.operationid = 11; //abonament banca
              info.operationDescription = "abonament banca";
            }
            if (
              description.includes("ro54trez21620a470300xxxx") ||
              description.includes("ro14trez2165503xxxxxxxxx")
            ) {
              if (description.includes("munca")) {
                info.operationid = 7; // plata munca
                info.operationDescription = "Plata munca";
              } else {
                info.operationid = 6; // plata pensie sanatate munca, taxa profit
                info.operationDescription =
                  "Plata pensie sanatate munca, taxa profit";
              }
            }

            // if (description.startsWith("Incasare")) {
            //   info.operationid = 13; //abonament banca
            //   info.operationDescription = "Intrare salar";
            // }

            if (description.startsWith("retragere de numerar")) {
              info.operationid = 8; // transfer cont personal
              info.operationDescription = "transfer cont personal";
            }

            if (description.startsWith("comision")) {
              info.operationid = 12; //comision incasare
              info.operationDescription = "Comision incasare";
            }
            if (!transaction.date) {
              debugger;
            }

            result.push({
              index: index,
              suma: nValue,
              description: description,
              ...info,
              dataInregistrare: dateStringToEpoch(transaction.date),
            });
            // transaction.records.push({
            //   index: index,
            //   suma: nValue,
            //   description: description,
            //   ...info,
            // });
            description = "";
            // console.log(transaction);
          } else {
            description += response;
          }
        }
        if (mode === modes.START_WITH_RECORDS) {
          //   console.log(response + " " + "aaa");
          if (response.match(datePattern)) {
            // console.log("TRANSACTION_DATE");
            description = "";
            if (transaction) {
              transactions.push(transaction);
            }
            transaction = {};
            transaction.date = response;
            transaction.records = [];
            mode = modes.TRANSACTION_DATE;
          }
        }
        if (mode === modes.END_WITH_RECORDS) {
          transactions.push(transaction);
        }
        if (response === "RULAJ ZI" || response == "RULAJ TOTAL CONT") {
          mode = modes.START_WITH_RECORDS;
          // console.log("START_WITH_RECORDS RULAJ");
        }
        if (response === "TOTAL DISPONIBIL") {
          mode = modes.END_WITH_RECORDS;
          // console.log("END_WITH_RECORDS");
        }
        if (response === "SOLD ANTERIOR") {
          mode = modes.START_WITH_RECORDS;
          // console.log("START WITH RECORDS1");
        }
      });
      // console.log(decodeURI(element.R[0].T));
    });
  });

  debugger;
  // console.log(JSON.stringify(transactions, null, 4));
  return result;
  //   pdfData.Pages[0].Texts.forEach((element) => {
  //     element.R.forEach((element) => console.log(decodeURI(element.T)));
  //     // console.log(decodeURI(element.R[0].T));
  //   });
};

// const filePath = "../../uploads/965974f49a453ffdc9e04f8bf3d94b40/test/11.pdf";

const parsePdfFile = (file) => {
  let pdfParser = new PDFParser();
  return new Promise((resolve, reject) => {
    pdfParser.on("pdfParser_dataError", (errData) => {
      console.error(errData.parserError);
      resolve([]);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      const transactions = parsePdfData(pdfData);
      // allTransactions.push(...transactions);
      // pdfParser.end();
      pdfParser = null;
      return resolve(transactions);
      //   console.log(JSON.stringify(pdfData.Pages[0].Texts, null, 4));
    });
    fs.readFile(file, (err, pdfBuffer) => {
      if (!err) {
        pdfParser.parseBuffer(pdfBuffer);
      }
    });
  });
};

const parsePdfFiles = async (fileList) => {
  const transactions = [];
  for (let index = 0; index < fileList.length; index++) {
    const file = fileList[index];
    const temp = await parsePdfFile(file);
    // console.log(temp);
    transactions.push({
      file: file.split("/").pop(),
      dates: temp,
    });
  }
  return transactions;
};

// const response = parsePdfFiles([filePath]);
// console.log(response);
const executeParseBtFiles = async (request) => {
  debugger;
  const { bucket, list } = request.body;
  const fileList = list.map((file) => `./uploads/${bucket}/${file}`);
  console.log(fileList);
  const response = await parsePdfFiles(fileList);
  // console.log(response);
  return response;
};

// parsePdfFiles([
//   "../../uploads/965974f49a453ffdc9e04f8bf3d94b40/test/01.pdf",
//   "../../uploads/965974f49a453ffdc9e04f8bf3d94b40/test/02.pdf",
// ]).then((v) => console.log("ttt", JSON.stringify(v, null, 2)));

// parsePdfFiles([
//   "../../uploads/965974f49a453ffdc9e04f8bf3d94b40/test/02.pdf",
// ]).then((v) => console.log("ttt", JSON.stringify(v, null, 2)));

module.exports = {
  executeParseBtFiles,
};

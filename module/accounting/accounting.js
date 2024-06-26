const utils = require("../../utils/utils");
const mongoExpression = require("../bullet/expression/mongoExpression");
const { executeDeltaFunction } = require("../expression/code");
const management = require("../management/management");

class Accounting {
  async getTaxesSalaryAndDeltaFunction(bulletConnection, angajatId) {
    const country_taxes = await bulletConnection.find("_general_taxes11", {});
    const salaries = await bulletConnection.find(
      `_angajat_salary${angajatId}`,
      {}
    );
    const deltaFunction = await management.getFunctionFromModule(
      bulletConnection,
      "my_module",
      "accounting"
    );

    return { country_taxes, salaries, deltaFunction };
  }

  async getAccountingRecordById(bulletConnection, id, angajatId) {
    const collection = `_accounting_history${angajatId}`;
    const respopnse = await bulletConnection.findOneById(collection, _id);
    return respopnse;
  }

  async getAccountingRecordsNewerThan(
    bulletConnection,
    accountingRequest,
    angajatId
  ) {
    const collection = `_accounting_history${angajatId}`;
    const expression = `trace.accountingRequest.dataTranzactie > ${accountingRequest.dataTranzactie}`;
    const find = mongoExpression.createMongoQuery(expression);

    const newerAccountingRecords = await bulletConnection.find(
      collection,
      find,
      { "trace.accountingRequest.dataTranzactie": 1 }
    );
    return newerAccountingRecords;
  }

  async getFirstAcountingRecordOlderThan(
    bulletConnection,
    accountingRequest,
    angajatId
  ) {
    const collection = `_accounting_history${angajatId}`;
    const expression = `trace.accountingRequest.dataTranzactie < ${accountingRequest.dataTranzactie}`;
    const find = mongoExpression.createMongoQuery(expression);

    const olderRecord = await bulletConnection.findOne(collection, find);

    if (!olderRecord) {
      return {
        guid: "31ef10b0-bab4-77a8-b9db-551e48fa8374",
        numar: -1,
        taxe: {
          pensie: 0,
          sanatate: 0,
          munca: 0,
          dividende: 0,
          tva: 0,
          taxa_profit: 0,
          total: 0,
          tva_deductibil: 0,
        },
        casa: { firma: 0, cont_personal: 0, disponibil: 0 },
        salar: {
          value: 0,
        },
        taxeTrezorerie: 0,
      };
    }
    return olderRecord.trace.newConta;
  }

  async updateAccountingRecord(request) {
    debugger;
    const { body, bulletConnection } = request;
    const { accountingRequest, record, angajatId } = body;

    const collection = `_accounting_history${angajatId}`;

    const newerAccountingRecords = await this.getAccountingRecordsNewerThan(
      bulletConnection,
      accountingRequest,
      angajatId
    );
    const { country_taxes, salaries, deltaFunction } =
      await this.getTaxesSalaryAndDeltaFunction(bulletConnection, angajatId);

    let previous_casa = await this.getFirstAcountingRecordOlderThan(
      bulletConnection,
      accountingRequest,
      angajatId
    );

    const deltaResponse = executeDeltaFunction(deltaFunction, [
      { previous_casa, country_taxes, salaries },
      { accountingRequest },
    ]);
    if (!deltaResponse.deltaException) {
      previous_casa = deltaResponse.newConta;
      record.trace = deltaResponse;

      await bulletConnection.updateOneById(collection, record._id, {
        ...record,
      });
    }

    if (newerAccountingRecords.length === 0) {
      return record;
    }

    // there are newer records
    for (var accountingRecord of newerAccountingRecords) {
      const { trace } = accountingRecord;

      const deltaResponse = executeDeltaFunction(deltaFunction, [
        { previous_casa, country_taxes, salaries },
        { accountingRequest: trace.accountingRequest },
      ]);
      if (!deltaResponse.deltaException) {
        accountingRecord.trace = deltaResponse;
        previous_casa = deltaResponse.newConta;
        await bulletConnection.updateOneById(
          collection,
          accountingRecord._id,
          accountingRecord
        );
      }
    }

    return record;
  }

  async deleteAccountingRecord(request) {
    await this.updateAccountingRecord(request);
    debugger;

    const { body, bulletConnection } = request;
    const { record, angajatId } = body;
    const collection = `_accounting_history${angajatId}`;

    await bulletConnection.deleteOneById(bulletDataKey, collection, record._id);
  }

  async addAccountingRecord(request) {
    debugger;
    const { body, bulletConnection } = request;
    const { accountingRequest, angajatId } = body;

    const collection = `_accounting_history${angajatId}`;

    const newerAccountingRecords = await this.getAccountingRecordsNewerThan(
      bulletDataKey,
      accountingRequest,
      angajatId
    );
    const { country_taxes, salaries, deltaFunction } =
      await this.getTaxesSalaryAndDeltaFunction(bulletDataKey, angajatId);

    let previous_casa = await this.getFirstAcountingRecordOlderThan(
      bulletDataKey,
      accountingRequest,
      angajatId
    );

    const deltaResponse = executeDeltaFunction(deltaFunction, [
      { previous_casa, country_taxes, salaries },
      { accountingRequest },
    ]);
    let response = {};
    if (!deltaResponse.deltaException) {
      previous_casa = deltaResponse.newConta;
      debugger;
      response = {
        guid: utils.guid(),
        trace: deltaResponse,
      };
      const { _id } = await bulletConnection.insertOne(collection, response);
      response._id = _id;
    }

    if (newerAccountingRecords.length === 0) {
      return response;
    }

    // there are newer records
    for (var accountingRecord of newerAccountingRecords) {
      const { trace } = accountingRecord;

      const deltaResponse = executeDeltaFunction(deltaFunction, [
        { previous_casa, country_taxes, salaries },
        { accountingRequest: trace.accountingRequest },
      ]);
      if (!deltaResponse.deltaException) {
        accountingRecord.trace = deltaResponse;
        previous_casa = deltaResponse.newConta;
        await bulletConnection.updateOneById(
          collection,
          accountingRecord._id,
          accountingRecord
        );
      }
    }
    return response;
  }
}
module.exports = new Accounting();

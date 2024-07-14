const utils = require("../../utils/utils");
const mongoExpression = require("../bullet/expression/mongoExpression");
const { executeDeltaFunction } = require("../expression/code");
const management = require("../management/management");
const { ObjectId } = require("mongodb");

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

  async deleteCategory(request) {
    debugger;
    const { body, bulletConnection, tokenObj } = request;
    const { parentId } = body;
    if (!parentId) {
      throw new Error("CANNOT_DELETE_ROOT_CATEGORY");
    }
    const collection = `categories_${tokenObj.clientId}`;
    const firstChild = await bulletConnection.findOne(collection, {
      parentId: body._id,
    });
    if (firstChild) {
      throw new Error("COLLECTION_CONTAINS_SUBCATEGORIES");
    }

    const moneyTransactionCollection = `money_transactions_${tokenObj.clientId}`;

    const firstTransaction = await bulletConnection.findOne(
      moneyTransactionCollection,
      {
        category_id: body._id,
      }
    );
    if (firstTransaction) {
      throw new Error("COLLECTION_CONTAINS_TRANSACTIONS");
    }

    await bulletConnection.deleteOneById(collection, body._id);
  }

  async updatecategoryAmounts(
    bulletConnection,
    categoryCollectionName,
    parentIds,
    body
  ) {
    const mongoIds = parentIds.map((id) => {
      return ObjectId(id);
    });

    await bulletConnection.updateMany(
      categoryCollectionName,
      { _id: { $in: mongoIds } }, //parentIds,
      body
    );

    const categories = await bulletConnection.find(categoryCollectionName, {
      _id: { $in: mongoIds },
    });

    return { categories };
  }

  async addMoneyTransaction(request) {
    const { body, bulletConnection, tokenObj } = request;

    const {
      parentIds = [],
      category_id,
      entityId,
      accountId,
      type,
      difs,
    } = body;

    parentIds.push(category_id);

    const MONEY_ACCOUNT_COLLECTION = `money_account_${tokenObj?.clientId}`;
    const collectionExtension = entityId || tokenObj.clientId;

    delete body.parentIds;
    if (!body._id) {
      delete body._id;
    }

    debugger;
    const collection = `money_transactions_${collectionExtension}`;
    if (body._id) {
      debugger;
      const mongoUpdateInstructions = {};
      if (difs.amount) {
        mongoUpdateInstructions.$inc = {
          amount: difs.amount.current - difs.amount.prev,
        };
        delete difs.amount;
      }

      const MONEY_TRANSACTION_TYPE = {
        INCOME: 1,
        EXPENSE: 2,
        TRANSFER: 3,
      };

      if (difs.accountId) {
        // if(difs.type){
        // if(difs.type.current === ){
        // }

        // revert amount from the previous account
        await bulletConnection.updateOneById(
          MONEY_ACCOUNT_COLLECTION,
          difs.accountId.prev,
          {
            $inc: {
              amount: difs.amount.prev * -1,
            },
          }
        );

        mongoUpdateInstructions.$set = {
          accountId: difs.accountId.current,
        };
        delete difs.accountId;
      }

      if (difs.date) {
        mongoUpdateInstructions.$set = {
          date: difs.date.current,
        };
        delete difs.date;
      }

      if (difs.category_id) {
        mongoUpdateInstructions.$set = {
          category_id: difs.category_id.current,
        };
        delete difs.category_id;
      }
      await bulletConnection.updateOneById(
        collection,
        body._id,
        mongoUpdateInstructions
      );
    } else {
      await bulletConnection.insertOne(collection, body);
    }

    //update the available amount for the input account
    debugger;

    await bulletConnection.updateOneById(
      MONEY_ACCOUNT_COLLECTION,
      body.accountId,
      {
        $inc: {
          amount: body.amount,
        },
      }
    );

    //end of update

    const categoryCollection = `categories_${collectionExtension}`;

    const updateRequest = {
      $inc: {
        transactionsAmount: body.amount,
      },
    };
    const categoriesToBeUpdated = [category_id];
    return await this.updatecategoryAmounts(
      bulletConnection,
      categoryCollection,
      categoriesToBeUpdated,
      updateRequest
    );
  }

  async deleteMoneyTransaction(request) {
    const { body, bulletConnection, tokenObj } = request;

    const { parentIds = [], category_id, entityId } = body;
    parentIds.push(category_id);

    const collectionExtension = entityId || tokenObj.clientId;

    const moneyTransactionsCollectionName = `money_transactions_${collectionExtension}`;

    const response = await bulletConnection.deleteOneById(
      moneyTransactionsCollectionName,
      body._id
    );

    // return response;
    const categoriesToBeUpdated = [category_id];
    const updateRequest = {
      $inc: {
        transactionsAmount: -body.amount,
      },
    };
    const categoryCollectionName = `categories_${collectionExtension}`;
    return await this.updatecategoryAmounts(
      bulletConnection,
      categoryCollectionName,
      categoriesToBeUpdated,
      updateRequest
    );
  }

  async getAccountsForInvitedUsers(request) {
    const { body, bulletConnection, tokenObj } = request;
    const { _id } = tokenObj;
    const collection = `invited_users_${_id}`;
    const response = await bulletConnection.find(collection, {});
    return response;
  }
}
module.exports = new Accounting();

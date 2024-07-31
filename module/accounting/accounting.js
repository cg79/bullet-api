const utils = require("../../utils/utils");
const mongoExpression = require("../bullet/expression/mongoExpression");
const { executeDeltaFunction } = require("../expression/code");
const management = require("../management/management");
const { ObjectId } = require("mongodb");
const bulletHelpers = require("../bullet/bullet-helpers");

const MONEY_TRANSACTION_TYPE = {
  INCOME: 1,
  EXPENSE: 2,
  TRANSFER: 3,
};

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

  async updatecategoryAmounts(request, isTransactionDeleted) {
    const { bulletConnection, body, tokenObj } = request;
    const { category_id, entityId, type, amount } = body;

    const collectionExtension = entityId || tokenObj.clientId;
    const categoryCollectionName = `categories_${collectionExtension}`;

    const field = type === MONEY_TRANSACTION_TYPE.INCOME ? "income" : "expense";

    let transactionDirection = type === MONEY_TRANSACTION_TYPE.INCOME ? 1 : -1;
    if (isTransactionDeleted) {
      transactionDirection *= -1;
    }

    const updateRequest = {
      $inc: {
        [field]: transactionDirection * amount,
      },
    };
    await bulletConnection.updateOneById(
      categoryCollectionName,
      category_id,
      updateRequest
    );

    const category = await bulletConnection.findOneById(
      categoryCollectionName,
      category_id
    );

    return category;
  }

  async updateAvailableMoneyForAccout(
    body,
    bulletConnection,
    MONEY_ACCOUNT_COLLECTION
  ) {
    const { accountId, amount } = body;
    // let amountValue = amount;
    // switch (type) {
    //   case MONEY_TRANSACTION_TYPE.INCOME:
    //     break;
    //   case MONEY_TRANSACTION_TYPE.EXPENSE:
    //     amountValue = -amount;
    //     break;
    //   case MONEY_TRANSACTION_TYPE.TRANSFER:
    //     amountValue = -amount;
    //     break;
    //   default:
    //     break;
    // }

    const updatedDbAccount = await this.updateDbAvailableAccountMoney(
      accountId,
      amount,
      bulletConnection,
      MONEY_ACCOUNT_COLLECTION
    );
    return updatedDbAccount;
    // await bulletConnection.updateOneById(MONEY_ACCOUNT_COLLECTION, accountId, {
    //   $inc: {
    //     amount: amountValue,
    //   },
    // });
  }

  async updateDbAvailableAccountMoney(
    accountId,
    amount,
    bulletConnection,
    MONEY_ACCOUNT_COLLECTION
  ) {
    await bulletConnection.updateOneById(MONEY_ACCOUNT_COLLECTION, accountId, {
      $inc: {
        amount,
      },
    });
    return await bulletConnection.findOneById(
      MONEY_ACCOUNT_COLLECTION,
      accountId
    );
  }

  async adjustAvailableMoneyForAccoutWhenAmountTransactionChanged(
    body,
    bulletConnection,
    MONEY_ACCOUNT_COLLECTION
  ) {
    const { type, accountId, difs } = body;

    const { prev: prevAmount, current: currentAmount } = difs.amount;
    let adjustement = 0;

    switch (type) {
      case MONEY_TRANSACTION_TYPE.INCOME:
        //inainte s-a adaugat un incasare
        //acum ar trebuii sa se scada din incasare
        // inainte amountul a fost amount - prevAmount
        // acuma amountul ar trebuii sa fie cat a fost  - currentAmount, adica: amount - prevAmount - currentAmount
        adjustement = currentAmount - prevAmount;

        break;
      case MONEY_TRANSACTION_TYPE.EXPENSE:
        // inainte s-a scazut prev din coont asa ca trebuie sa adaug
        adjustement = prevAmount - currentAmount;

        break;
      case MONEY_TRANSACTION_TYPE.TRANSFER:
        break;
      default:
        break;
    }
    delete difs.amount;
    return await this.updateDbAvailableAccountMoney(
      accountId,
      adjustement,
      bulletConnection,
      MONEY_ACCOUNT_COLLECTION
    );
  }

  async updateAvailableMoneyForAccoutWhenDeleteTransaction(request) {
    const { body, bulletConnection, tokenObj } = request;
    const { accountId, type, amount } = body;

    const amountValue = amount * -1;

    const MONEY_ACCOUNT_COLLECTION = `money_account_${tokenObj?.clientId}`;

    // switch (type) {
    //   case MONEY_TRANSACTION_TYPE.INCOME:
    //     amountValue = -amount;
    //     break;
    //   case MONEY_TRANSACTION_TYPE.EXPENSE:
    //     amountValue = amount;
    //     break;
    //   case MONEY_TRANSACTION_TYPE.TRANSFER:
    //     amountValue = -amount;
    //     break;
    //   default:
    //     break;
    // }

    await bulletConnection.updateOneById(MONEY_ACCOUNT_COLLECTION, accountId, {
      $inc: {
        amount: amountValue,
      },
    });
  }

  async adjustAvailableMoneyForAccoutWhenTransactionTypeChanged(
    body,
    bulletConnection,
    MONEY_ACCOUNT_COLLECTION
  ) {
    debugger;
    const { accountId, difs, amount } = body;
    const {
      type: { prev, current },
    } = difs;

    let adjustement = 0;

    if (!difs.amount) {
      // nu s-a facut update la suma
      switch (prev) {
        case MONEY_TRANSACTION_TYPE.INCOME:
          //inainte s-a adaugat un incasare
          //acum ar trebuii sa se scada din incasare
          // inainte amountul a fost amount - prevAmount
          // acuma amountul ar trebuii sa fie cat a fost  - currentAmount, adica: amount - prevAmount - currentAmount
          adjustement = -amount - amount;

          break;
        case MONEY_TRANSACTION_TYPE.EXPENSE:
          // inainte s-a scazut prev din coont asa ca trebuie sa adaug
          adjustement = amount + amount;

          break;
        case MONEY_TRANSACTION_TYPE.TRANSFER:
          break;
        default:
          break;
      }

      return await this.updateDbAvailableAccountMoney(
        accountId,
        adjustement,
        bulletConnection,
        MONEY_ACCOUNT_COLLECTION
      );
    }

    const { prev: prevAmount, current: currentAmount } = difs.amount;

    switch (prev) {
      case MONEY_TRANSACTION_TYPE.INCOME:
        //inainte s-a adaugat un incasare
        //acum ar trebuii sa se scada din incasare
        // inainte amountul a fost amount - prevAmount
        // acuma amountul ar trebuii sa fie cat a fost  - currentAmount, adica: amount - prevAmount - currentAmount
        adjustement = -prevAmount - currentAmount;

        break;
      case MONEY_TRANSACTION_TYPE.EXPENSE:
        // inainte s-a scazut prev din coont asa ca trebuie sa adaug
        adjustement = prevAmount + prevAmount + currentAmount;

        break;
      case MONEY_TRANSACTION_TYPE.TRANSFER:
        break;
      default:
        break;
    }
    return await this.updateDbAvailableAccountMoney(
      accountId,
      adjustement,
      bulletConnection,
      MONEY_ACCOUNT_COLLECTION
    );
    delete difs.amount;
  }

  async addOrEditMoneyTransaction(request) {
    const { body } = request;

    if (!body._id) {
      delete body._id;
    }

    debugger;
    if (body._id) {
      return await this.editMoneyTransaction(request);
    } else {
      return await this.addMoneyTransaction(request);
    }
  }

  async addMoneyTransaction(request) {
    const { body, bulletConnection, tokenObj } = request;
    debugger;
    if (body.amount < 0) {
      body.amount = -body.amount;
    }

    const { entityId, amount, type, accountId } = body;

    let amountValue = amount;
    switch (type) {
      case MONEY_TRANSACTION_TYPE.INCOME:
        break;
      case MONEY_TRANSACTION_TYPE.EXPENSE:
        amountValue = -amount;
        break;
      case MONEY_TRANSACTION_TYPE.TRANSFER:
        amountValue = -amount;
        break;
      default:
        break;
    }
    body.amount = amountValue;

    const MONEY_ACCOUNT_COLLECTION = `money_account_${tokenObj?.clientId}`;
    const collectionExtension = entityId || tokenObj.clientId;
    const moneyTransactionCollection = `money_transactions_${collectionExtension}`;

    const updatedDbAccount = await this.updateDbAvailableAccountMoney(
      accountId,
      amountValue,
      bulletConnection,
      MONEY_ACCOUNT_COLLECTION
    );

    body.accountAmount = updatedDbAccount.amount;

    await bulletConnection.insertOne(moneyTransactionCollection, body);

    const category = await this.updatecategoryAmounts({
      body,
      bulletConnection,
      tokenObj,
    });
    return { category };
  }

  async editMoneyTransaction(request) {
    const { body, bulletConnection, tokenObj } = request;

    const {
      parentIds = [],
      category_id,
      entityId,
      accountId,
      type,
      difs,
      amount,
    } = body;

    parentIds.push(category_id);

    const MONEY_ACCOUNT_COLLECTION = `money_account_${tokenObj?.clientId}`;
    const collectionExtension = entityId || tokenObj.clientId;

    delete body.parentIds;
    if (!body._id) {
      delete body._id;
    }

    debugger;
    const MONEY_TRANSACTION_COLLECTION = `money_transactions_${collectionExtension}`;

    const mongoUpdateTransactionInstructions = {};

    if (difs.type) {
      mongoUpdateTransactionInstructions.$set = {
        type: difs.type.current,
      };
      const updatedDbAccount =
        await this.adjustAvailableMoneyForAccoutWhenTransactionTypeChanged(
          body,
          bulletConnection,
          MONEY_ACCOUNT_COLLECTION
        );

      mongoUpdateTransactionInstructions.$set = {
        accountAmount: updatedDbAccount.amount,
      };

      delete difs.type;
    }
    if (difs.amount) {
      mongoUpdateTransactionInstructions.$set = {
        amount: amount,
      };

      const updatedDbAccount =
        await this.adjustAvailableMoneyForAccoutWhenAmountTransactionChanged(
          body,
          bulletConnection,
          MONEY_ACCOUNT_COLLECTION
        );
      mongoUpdateTransactionInstructions.$set = {
        accountAmount: updatedDbAccount.amount,
      };
      delete difs.amount;
    }

    if (difs.accountId) {
      mongoUpdateTransactionInstructions.$set = {
        accountId: difs.accountId.current,
      };
      // revert amount from the previous account
      await this.updateAvailableMoneyForAccout(
        body,
        bulletConnection,
        MONEY_ACCOUNT_COLLECTION
      );

      delete difs.accountId;
    }

    if (difs.date) {
      mongoUpdateTransactionInstructions.$set = {
        date: difs.date.current,
      };
      delete difs.date;
    }

    if (difs.category_id) {
      mongoUpdateTransactionInstructions.$set = {
        category_id: difs.category_id.current,
      };
      delete difs.category_id;
    }
    if (Object.keys(mongoUpdateTransactionInstructions).length > 0) {
      await bulletConnection.updateOneById(
        MONEY_TRANSACTION_COLLECTION,
        body._id,
        mongoUpdateTransactionInstructions
      );
    }
  }

  async deleteMoneyTransaction(request) {
    const { body, bulletConnection, tokenObj } = request;

    const { parentIds = [], category_id, entityId } = body;
    parentIds.push(category_id);

    const collectionExtension = entityId || tokenObj.clientId;

    const moneyTransactionsCollectionName = `money_transactions_${collectionExtension}`;

    await bulletConnection.deleteOneById(
      moneyTransactionsCollectionName,
      body._id
    );

    debugger;
    await this.updateAvailableMoneyForAccoutWhenDeleteTransaction(request);

    const category = await this.updatecategoryAmounts(request, true);
    return { category };
  }

  async getAccountsForInvitedUsers(request) {
    const { body, bulletConnection, tokenObj } = request;
    const { _id } = tokenObj;
    const collection = `invited_users_${_id}`;
    const response = await bulletConnection.find(collection, {});
    return response;
  }

  async aggregateAmountByCategory(request) {
    const { body, bulletConnection, tokenObj } = request;
    debugger;
    const { find = {}, entityId } = body;
    const newFind = bulletHelpers.ensureFindExpression(find, {});

    const collectionExtension = entityId || tokenObj.clientId;
    const MONEY_TRANSACTION_COLLECTION = `money_transactions_${collectionExtension}`;

    // $match: {
    //   date: { $gte: startDate, $lte: endDate },
    // },

    const pipeline = [
      {
        $match: newFind,
      },
      {
        $group: {
          _id: "$category_id",
          income: { $sum: "$income" },
          expense: { $sum: "$expense" },
        },
      },
      {
        $project: {
          _id: 0,
          category_id: "$_id",
          income: 1,
          expense: 1,
        },
      },
    ];
    const collection = bulletConnection.getCollection(
      MONEY_TRANSACTION_COLLECTION
    );

    const result = await collection.aggregate(pipeline).toArray();
    console.log(result);
    const response = {};
    result.forEach((el) => {
      response[el.category_id] = {
        income: el.income,
        expense: el.expense,
      };
    });
    return response;
  }
}
module.exports = new Accounting();

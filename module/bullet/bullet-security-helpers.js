const BULLET_SECURITY = {
  LIST: 1,
  CREATE: 2,
  CREATE_TOKEN: 4,
  DELETE_OTHERS: 8,
  DELETE: 16,
  UPDATE_OTHERS: 32,
  UPDATE: 64,

  REGISTER_FUNCTIONS: 128,

  EXECUTE_FUNCTIONS: 256,
};

class BulletSecurityHelpers {
  verifyAllowCreateCollection(bulletDataKey, tokenObj, collectionName) {
    return;
    const collectionAlreadyExisted =
      collectionName in bulletDataKey.constraints;

    if (
      (bulletDataKey.security & BULLET_SECURITY.CREATE) ==
        BULLET_SECURITY.CREATE ||
      (tokenObj.security &&
        (tokenObj.security & BULLET_SECURITY.CREATE) == BULLET_SECURITY.CREATE)
    ) {
      if (!collectionAlreadyExisted) {
        throw new Error('NO permission for "create new collection" ');
      }
    }
    if (!collectionAlreadyExisted) {
      bulletDataKey.constraints[collectionName] = null;
    }
  }

  verifyAllowUpdateCollection(bulletDataKey, tokenObj, userid) {
    if (
      (bulletDataKey.security & BULLET_SECURITY.UPDATE) ==
        BULLET_SECURITY.UPDATE ||
      (tokenObj.security &&
        (tokenObj.security & BULLET_SECURITY.UPDATE) == BULLET_SECURITY.UPDATE)
    ) {
      throw new Error('NO permission for "update collection" ');
    }

    if (
      (bulletDataKey.security & BULLET_SECURITY.UPDATE_OTHERS) ===
        BULLET_SECURITY.UPDATE_OTHERS ||
      (tokenObj.security &&
        (tokenObj.security & BULLET_SECURITY.UPDATE_OTHERS) ==
          BULLET_SECURITY.UPDATE_OTHERS)
    ) {
      if (userid !== tokenObj._id) {
        throw new Error(
          'NO permission for "update other user records". Note: Please ensure the userid is part of "find" expression'
        );
      }
    }
  }

  verifyAllowDeleteCollection(bulletDataKey, tokenObj, userid) {
    if (
      (bulletDataKey.security & BULLET_SECURITY.DELETE) ==
        BULLET_SECURITY.DELETE ||
      (tokenObj.security &&
        (tokenObj.security & BULLET_SECURITY.DELETE) == BULLET_SECURITY.DELETE)
    ) {
      throw new Error('NO permission for "delete collection" ');
    }

    if (
      (bulletDataKey.security & BULLET_SECURITY.DELETE_OTHERS) ===
        BULLET_SECURITY.DELETE_OTHERS ||
      (tokenObj.security &&
        (tokenObj.security & BULLET_SECURITY.DELETE_OTHERS) ==
          BULLET_SECURITY.DELETE_OTHERS)
    ) {
      if (userid !== tokenObj._id) {
        throw new Error(
          'NO permission for "delete other user records". Note: Please ensure the userid is part of "find" expression'
        );
      }
    }
  }

  verifyAllowListCollections(bulletDataKey, tokenObj) {
    if (
      (bulletDataKey.security & BULLET_SECURITY.LIST) == BULLET_SECURITY.LIST ||
      (tokenObj.security &&
        (tokenObj.security & BULLET_SECURITY.LIST) == BULLET_SECURITY.LIST)
    ) {
      throw new Error('NO permission for "view collections" ');
    }
    // if (!tokenObj.isrootuser) {
    //   throw new Error(
    //     'NO permission for "view collections". you are not a root user'
    //   );
    // }
  }
}

module.exports = {
  bulletSecurityHelpers: new BulletSecurityHelpers(),
  BULLET_SECURITY,
};

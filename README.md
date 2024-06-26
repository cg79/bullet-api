
This is a nodejs wrapper over the mongo db functions, providing to the developer a fluent and readable mechanism of querying the database

- can be used directly from the front end
- Another security layer can be added by using a secretKey and this key should be added by your custom server

# Prerequisites
In order to use the bullet api, the `declarative-fluent-bullet-api` must be installed

`npm install declarative-fluent-bullet-api`

the source code for the fluent approach can be found here: https://github.com/cg79/declarative-bullet-api-fluent

- Inserts an object into a collection
```javascript
// insert a new object into the 'insert1' collection
      const insertResponse = await createDeclarativeBulletApi()
        .body({ test: 1, guid })
        .collection((c) => c.name("insert1").method(BULLET_METHOD.INSERT))
        .execute()
      
```

- Inserts an object into a specific collection and returns the response as part of a named key
```javascript
const insertResponse = await createDeclarativeBulletApi()
        .body({ test: 1, guid })
        .key('myKey')
        .collection((c) =>
          c.name("insert1").owned(true).method(BULLET_METHOD.INSERT)
        )
        .execute()
```

- Inserts an object into a specific collection ``${name}${guid}``
```javascript
const insertResponse = await createDeclarativeBulletApi()
        .body({ test: 1, guid })
        .collection((c) =>
          c.name("insert1").useGuid(true).method(BULLET_METHOD.INSERT)
        )
        .execute()
```

- Inserts an object into a collection and decorate the body with a runtime calculated field
```javascript
const insertResponse = await createDeclarativeBulletApi()
        .body({ test: 2, guid, my_date_value: new Date() })
        .bodyField("my_date_value_as_ms", (f) =>
            f.moduleFunction((mf) => mf.method("dateAsTimeMilliseconds"))
            .take((s) => s.fields("my_date_value"))
        )
        .collection((c) =>
          c.name(CONSTRAINTS_COLLECTION).method(BULLET_METHOD.INSERT)
        )
        .execute()
```
In this case, the body will contain the `my_date_value`. The developer has the option to register his javascript functions which will be executed at runtime

- Insert an array of objects
```javascript
const insertResponse = await createDeclarativeBulletApi()
        .body([
          { test: 1, guid },
          { test: 2, guid },
        ])
        .collection((c) =>
          c.name("insert_bulk_collection").method(BULLET_METHOD.INSERT)
        )
        .execute()
```

- new property will be added to the body by calling an external api
```javascript
const insertResponse = await createDeclarativeBulletApi()
        .body({ test: 1, guid, name: "claudiu gombos" })
        .bodyField("newProp3", (x) =>
          x.route("/api/public/currentdate").take((t) => t.fields("data.date"))
        )
        .collection((c) => c.name("insert1").method(BULLET_METHOD.INSERT))
        .execute()
```

------------------

# Find

- Find by _id and rename response keys

```javascript
    const response = await createDeclarativeBulletApi()
      .body({ _id: sampleData[0]._id })
      .collection((c) => c.name(FIND_COLLECTION).method(BULLET_METHOD.FIND_ONE))
      .take((t) =>
        t
          .addFromInto((ft) => ft.from("age").into("ageProperty"))
          .addFromInto((ft) => ft.from("test").into("testProperty"))
      )
      .execute()
```

- Find By guid

```javascript
 const response = await createDeclarativeBulletApi()
      .body({ guid: sampleData[0].guid })
      .collection((c) => c.name(FIND_COLLECTION).method(BULLET_METHOD.FIND_ONE))
      .take((t) => t.fields("age,test"))
      .execute()
```

- Find by multiple conditions

```javascript
const response = await createDeclarativeBulletApi()
      .find((el) => el.findByObject({ test: 1, age: 5 }))
      .collection((c) => c.name(FIND_COLLECTION).method(BULLET_METHOD.FIND_ONE))
      .take((t) => t.exclude("items,test"))
      .execute()
```

- Find by string expression

```javascript
const response = await createDeclarativeBulletApi()
      .find((el) => el.expression("test = 1 && age > 4"))
      .collection((c) => c.name(FIND_COLLECTION).method(BULLET_METHOD.FIND))
      .sort((s) => s.field("age").ascending(true))
      .sort((s) => s.field("categoryName").ascending(fal))
      .execute()
```

- Find by regular expression
```javascript
const response = await createDeclarativeBulletApi()
      .find((el) =>
        el.regex({
          categoryName: "^flo",
        })
      )
      .collection((c) => c.name(FIND_COLLECTION).method(BULLET_METHOD.FIND_ONE))
      .execute()
```

- Find by a list of values
```javascript
const response = await createDeclarativeBulletApi()
      .find((el) => el.in({ age: [5, 6] }))
      .collection((c) => c.name(FIND_COLLECTION).method(BULLET_METHOD.FIND))
      .execute()
```

- Find into nested objects
```javascript
const response = await createDeclarativeBulletApi()
      .find((el) => el.expression("items.id>3"))
      .collection((c) => c.name(FIND_COLLECTION).method(BULLET_METHOD.FIND))
      .sort((s) => s.field("age").ascending(false))
      .sort((s) => s.field("categoryName").ascending(false))
      .execute()
      
```

# Sorting
- Find all 

```javascript
const response = await createDeclarativeBulletApi()
      .collection((c) =>
        c.name(FIND_COLLECTION).method(BULLET_METHOD.FIND)
      )
      .sort((s) => s.field("age").ascending(false))
      .sort((s) => s.field("categoryName").ascending(false))
      .execute()
```


# Pagination

- Returns the paginated items

```javascript
const response = await createDeclarativeBulletApi()
      .find((el) => el.expression("age>0"))
      .collection((c) =>
        c.name(FIND_COLLECTION).method(BULLET_METHOD.PAGINATION)
      )
      .sort((s) => s.field("age").ascending(false))
      .sort((s) => s.field("categoryName").ascending(false))
      .page((p) => p.itemsOnPage(1).pageNo(1))
      .execute()
```

-----------------------

# update

- Update one entity
  
```javascript
const response = await createDeclarativeBulletApi()
      .body({ _id: sampleData[0]._id, newName: "newName", myDate: new Date() })
      .collection((c) =>
        c.name(FIND_COLLECTION).method(BULLET_METHOD.UPDATE_ONE)
      )
      .execute()
```

- update by guid (from body) - increment age by 1 + add a new element into nested items array
```javascript
const response = await createDeclarativeBulletApi()
      .body({
        guid: sampleData[0].guid,
        version: 2,
        inc: { age: 1 },
        push: {
          items: { newItem: true },
        },
      })
      .collection((c) =>
        c.name(FIND_COLLECTION).method(BULLET_METHOD.UPDATE_ONE)
      )
      .execute()
```

- Remove one item from a nested collection
```javascript
const response = await createDeclarativeBulletApi()
      .body({
        guid: sampleData[0].guid,
        pull: {
          items: { newItem: true },
        },
      })
      .collection((c) =>
        c.name(FIND_COLLECTION).method(BULLET_METHOD.UPDATE_ONE)
      )
      .execute()
```


# Insert Files

- Insert files on local server

```javascript
      const files: BulletFile[] = [];
      const cFile1 = cloneBulletFile(file1);
      cFile1.status = IFileStatus.AddedFile;

      const cFile2 = cloneBulletFile(file2);
      cFile2.status = IFileStatus.AddedFile;

      files.push(cFile1);
      files.push(cFile2);

      const insertResponse = await createDeclarativeBulletApi()
        .body({ test: 1, guid: insertUpdateGuid })
        .collection((c) => c.name(collectionName).method(BULLET_METHOD.INSERT))
        .storage((s) =>
          s.bucket("claudiudeclarativeapibucket").provider(storageProvider).addFiles(files)
        )
        .execute()
      
```


- Insert files in google bucket

```javascript
const files: BulletFile[] = [];
      const cFile1 = cloneBulletFile(file1);
      cFile1.status = IFileStatus.AddedFile;

      const cFile2 = cloneBulletFile(file2);
      cFile2.status = IFileStatus.AddedFile;

      files.push(cFile1);
      files.push(cFile2);

      const insertResponse = await createDeclarativeBulletApi()
        .body({ test: 1, guid: insertUpdateGuid })
        .collection((c) => c.name(collectionName).method(BULLET_METHOD.INSERT))
        .storage((s) =>
          s.bucket("claudiudeclarativeapibucket").provider(storageProvider).addFiles(files)
        )
        .execute()
```


- Local files --> delete one + add new one
```javascript
const files: BulletFile[] = [];

      const cFile1 = this.cloneBulletFile(this.state.file1);
      cFile1.status = IFileStatus.AddedFile;
      files.push(cFile1);

      const cFile2 = this.cloneBulletFile(this.state.file2);
      cFile2.status = IFileStatus.DeletedFile;
      files.push(cFile2);

      const insertUpdateGuid = utils.createUUID();

      let apiBulletRequest = null;

      const bucketName = "claudiudeclarativeapibucket";
      const insertResponse = await createDeclarativeBulletApi()
        .body({ test: 1, guid: insertUpdateGuid })
        .collection((c) => c.name("insert1").method(BULLET_METHOD.INSERT))
        .storage((s) =>
          s.bucket(bucketName).provider(storageProvider).addFiles(files)
        )
        .execute()
```

- google bucket files --> delete one + add new one (linked collection)

```javascript
const files: BulletFile[] = [];
      const cFile1 = cloneBulletFile(file1);
      cFile1.status = IFileStatus.AddedFile;

      const cFile2 = cloneBulletFile(file2);
      cFile2.status = IFileStatus.AddedFile;

      files.push(cFile1);
      files.push(cFile2);

      const insertResponse = await createDeclarativeBulletApi()
        .body({ test: 1, guid: insertUpdateGuid })
        .collection((c) => c.name(collectionName).method(BULLET_METHOD.INSERT))
        .storage((s) =>
          s.bucket("claudiudeclarativeapibucket").provider(storageProvider).addFiles(files)
        )
        .execute()
      
```

# join collections

- join 2 collections
```javascript
const response = await createDeclarativeBulletApi()
      .collection((c) => c.name(POST_COLLECTION).method(BULLET_METHOD.FIND_ONE))
      .join((j) =>
        j
          .with((w) =>
              w.collection((c) =>
                c.name(COMMENT_COLLECTION).method(BULLET_METHOD.FIND_ONE)
              )
              .field("postGuid")
          )
          .field("guid")
      )
      .join((j) =>
        j
          .with((w) =>
              w.collection((c) =>
                c.name("zsys-users").method(BULLET_METHOD.FIND_ONE)
              )
              .field("_id")
          )
          .key("ADDED_BY")
          .field("userid")
      )
      .execute()
```

- join 1 to many

``` javascript
const response = await createDeclarativeBulletApi()
      .collection((c) => c.name(POST_COLLECTION).method(BULLET_METHOD.FIND_ONE))
      .join((j) =>
        j
          .with((w) =>
              w.collection((c) =>
                c.name(COMMENT_COLLECTION).method(BULLET_METHOD.FIND)
              )
              .field("postGuid")
          )
          .key('my_comments')
          .field("guid")
      )
      .execute()
```

# custom flows

- Insert Object if not exists
  ```javascript
  execution steps:
      1. search into insert1 collection for an object having guid value
      2. check the stop condition by calling the exists method from my_module (created from dashboard)
      3. if object is found --> throw exception with code equal "errorcode"
      4. if object is not found --> execute the rest part of the flow (which inserts the data)

      const insertResponse = await createDeclarativeBulletApi()
        .find((f) => f.findByObject({ guid }))
        .collection((c) => c.name("insert1").method(BULLET_METHOD.FIND_ONE))
        .flow((f) =>
          f
            .stopIf((e) =>
              e
                .errorcode("as")
                .moduleFunction((mf) => mf.method("exists").module("my_module"))
            )

            .body({ guid, a: 1 })
            .collection((c) => c.name("insert1").method(BULLET_METHOD.INSERT))
        )
        .execute()
  ```

  - Insert into collection1 followed by another flow which inserts into collection2 the collection2 response is returned under the collection2response key
  
  ```javascript
  const insertResponse = await createDeclarativeBulletApi()
        .body({ guid, a: 1 })
        .collection((c) => c.name("collection1").method(BULLET_METHOD.INSERT))
        .flow((f) =>
          f
            .body({ guid, a: 2 })
            .collection((c) => c.name("collection2").method(BULLET_METHOD.INSERT))
            .key("collection2response")
        )
        .execute()
  ```

  - nserts and returns _id's with key and alias
  ```javascript
      //newProp field is populated with the result of "guid" method

      const insertResponse = await createDeclarativeBulletApi()
        .body({ guid, a: 1 })
        .collection((c) => c.name("collection1").method(BULLET_METHOD.INSERT))
        .flow((f) =>
          f
            .body({ guid, a: 2 })
            .collection((c) => c.name("collection2").method(BULLET_METHOD.INSERT))
            .key("collection2response")
            .take((t) => t.addFromInto((f) => f.from("_id").into("id2")))
        )
        .execute()
      
  ```
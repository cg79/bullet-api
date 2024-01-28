
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
          x.route("/api/public/v1/currentdate").take((t) => t.fields("data.date"))
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


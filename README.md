
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




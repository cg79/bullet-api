
class XDatabases {

    constructor() {
        this.dict = {};
    }

    add(key, value) {
        this.dict[key] = value;
    }

    value(key) {
        return this.dict[key];
    }

    remove(key) {
        const mongoConnection = this.dict[key];
        if (!mongoConnection) {
            return;
        }
        //value.db.
        mongoConnection.connection.close();
        delete this.dict[key];
    }
}

module.exports = new XDatabases();
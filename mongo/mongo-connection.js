
class MongoConnection {
    constructor({connection, db}){
        this.connection = connection;
        this.db = db;
    }

    close(){
        if(!this.connection) {
            return;
        }
        this.connection.close();
    }
}

module.exports = MongoConnection;

class BulletError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BulletError';
      }
}

module.exports = BulletError;
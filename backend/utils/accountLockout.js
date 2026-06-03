const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

const accountLockoutPlugin = (schema) => {
  schema.add({
    loginAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    lockUntil: {
      type: Number,
      select: false
    }
  });

  schema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
  });

  schema.methods.incLoginAttempts = function() {
    if (this.lockUntil && this.lockUntil > Date.now()) {
      return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
    }
    const updates = { $inc: { loginAttempts: 1 } };
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
      updates.$set = { lockUntil: Date.now() + LOCK_TIME };
    }
    return this.updateOne(updates);
  };

  schema.methods.resetLoginAttempts = function() {
    return this.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
  };
};

module.exports = accountLockoutPlugin;

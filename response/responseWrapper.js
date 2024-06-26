class response {
  success(data) {
    return {
      success: true,
      data,
    };
  }

  failure(err) {
    let message = err;
    if (err.message) {
      message = err.message;
      // if (err.stack) {
      //   message += " " + err.stack;
      // }
    }
    // const message = err && err.message ? err.message + err.stack : err;
    return {
      success: false,
      message,
      text: err.text || "",
      // stack: err.stack,
    };
  }

  successMessage(obj) {
    const { message, data = {} } = obj;
    if (!message) {
      return {
        success: true,
        data,
      };
    }
    return {
      success: true,
      data,
      message,
    };
  }
}

module.exports = new response();

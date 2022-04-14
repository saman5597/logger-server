class AppError extends Error {
  constructor(message, statusCode, type) {
    // console.log(message)
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? 0 : -1;
    this.type = `${statusCode}`.startsWith("5")
      ? "Internal server Error"
      : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

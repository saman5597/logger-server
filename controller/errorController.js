const AppError = require("../utils/appError");

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use anothe value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

// DEVELOPMENT ENV ERROR

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// PRODUCTION ENV ERROR

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // 1) Log error
    console.error("ERROR 💥: ", err);

    // 2) Send generic message
    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode ?? 500;
  err.status = err.status || "error";
  // IF ERROR COMES IN DEVELOPMENT ENV
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  }
  // IF ERROR COMES IN PRODUCTION ENV
  else if (process.env.NODE_ENV === "PRODUCTION") {
    let error = { ...err };
    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    error = handleValidationErrorDB(error);
    sendErrorProd(err, res);
  }
};

// global error handling
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status ?? "error";
  // console.log("chal ja bhai", err.status);
  console.log(err);

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    type: err.type,
    generatedTime: new Date(),
  });
};

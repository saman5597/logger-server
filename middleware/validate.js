const User = require("../model/users");
const { checkMD5 } = require("../helper/helperFunctions.js");
const AppError = require("../utils/appError");

const authDevice = async (req, res, next) => {
  try {
    if (!req.headers["authorization"])
      throw { message: "Provide device authorization" };
    const projectMD5 = req.headers["authorization"].split(" ")[1];
    const tokenKey = req.headers["authorization"].split(" ")[0];
    // console.log(`${projectMD5} ${tokenKey}`);

    if (tokenKey !== "AgVa_Logger") {
      throw new AppError(`Invalid token.`, 401); // NJ-changes 13 Apr
    }

    if (!projectMD5) {
      throw new AppError(`Invalid Project code.`, 401); // NJ-changes 13 Apr
    }

    // proceed after authentication
    const isVerified = checkMD5(`${projectMD5}`);
    if (!isVerified) {
      throw new AppError(`Your are passing invalid project token!`, 401); // NJ-changes 13 Apr
    }

    next();
  } catch (error) {
    // console.log(error);
    next(new AppError(`${error.message}`, 400)); // NJ-changes 13 Apr
  }
};

module.exports = {
  authDevice,
};

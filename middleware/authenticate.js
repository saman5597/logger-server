const User = require("../model/users");

const redis = require("redis");
const url = require("url");
const AppError = require("../utils/appError");
let redisClient;
if (process.env.REDISCLOUD_URL) {
  let redisURL = url.parse(process.env.REDISCLOUD_URL);
  redisClient = redis.createClient(redisURL.port, redisURL.hostname, {
    no_ready_check: true,
  });
  redisClient.auth(redisURL.auth.split(":")[1]);
} else {
  redisClient = redis.createClient();
}
const JWTR = require("jwt-redis").default;
const jwtr = new JWTR(redisClient);

const authUser = async (req, res, next) => {
  try {
    if (!req.headers["authorization"])
      throw { message: "You are not logged in!!" };
    const token = req.headers["authorization"].split(" ")[1];

    if (!token) {
      // return res.status(401).json({'errormessage':"Authentication Failed!"});
      throw new AppError(`Unauthenticated.`, 401); // NJ-changes 13 Apr
    }

    const verified = await jwtr.verify(token, process.env.JWT_SECRET);
    if (!verified) {
      throw new AppError(`Not verified.`, 401); // NJ-changes 13 Apr
    }
    req.user = verified.user;
    console.log("req user", req.user);
    req.jti = verified.jti;

    // proceed after authentication
    next();
  } catch (error) {
    // console.log(error);
    next(new AppError(`${error.message}`, 401)); // NJ-changes 13 Apr
  }
};

const restrictToRole = async (req, res, next) => {
  // console.log("request created",req.user)
  const user = await User.findById(req.user);
  console.log("Details of user", user);
  console.log(user.isSuperAdmin);

  if (!user.isSuperAdmin) {
    throw new AppError(`You dont have permission to access this.`, 403); // NJ-changes 13 Apr
  }
  next();
};

module.exports = { authUser, restrictToRole };

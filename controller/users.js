const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const redis = require("redis");
const url = require("url");
const { makeId } = require("../helper/helperFunctions");

const JWTR = require("jwt-redis").default;

const Users = require("../model/users");
const ForgetPassword = require("../model/forgetPassword");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Email = require("../utils/email");

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
const jwtr = new JWTR(redisClient);
/**
 * api      POST @/api/logger/register
 * desc     @register for logger access only
 */
const registerUser = catchAsync(
  async (req, res) => {
    const { name, email, password } = req.body;
    const emailTaken = await Users.findOne({ email: email });

    if (emailTaken) {
      throw new AppError(`Email already taken`, 409);
    }

    if (!email || !name || !password) {
      throw new AppError(`Please fill all the details.`, 400); // NJ-changes 13 Apr
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await new Users({
      name,
      email,
      isSuperAdmin: false,
      passwordHash,
      image: "",
    });

    const savedUser = await user.save(user);

    if (!savedUser) {
      res.status(500).json({
        status: 0,
        data: {
          err: {
            generatedTime: new Date(),
            errMsg: "User not register",
            msg: "User not register",
            type: "MongodbError",
          },
        },
      });
    }

    if (savedUser) {
      const url = `${req.protocol}://${req.get("host")}/welcome`;

      new Email(email, url).sendWelcome();

      res.status(201).json({
        status: 1,
        data: { name: savedUser.name, avatar: savedUser.image },
        message: "Registered successfully!",
      });
    } else {
      throw new AppError(`Some error happened during registration`, 400); // NJ-changes 13 Apr
    }
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
      data: {
        err: {
          generatedTime: new Date(),
          errMsg: err.stack,
          msg: err.message,
          type: err.name,
        },
      },
    });
  }
);

/**
 *
 * @param {email, password} req
 * @param {token} res
 * @api     POST @/api/logger/login
 */

const loginUser = catchAsync(
  async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(`Email or password missing!`, 400); // NJ-changes 13 Apr
    }

    const isUserExist = await Users.findOne({ email: email });

    if (!isUserExist) {
      throw new AppError(`User not available with this email address.`, 404); // NJ-changes 13 Apr
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      isUserExist.passwordHash
    );

    if (!isPasswordCorrect) {
      throw new AppError(`Password is incorrect.`, 401); // NJ-changes 13 Apr
    }

    const id = { user: isUserExist._id };
    const token = await jwtr.sign(id, process.env.JWT_SECRET, {
      expiresIn: "15d",
    });

    return res.status(200).json({
      status: 1,
      message: `Logged in Successfully`,
      data: {
        token: token,
        name: isUserExist.name,
        email: isUserExist.email,
        image: isUserExist.image,
        isSuperAdmin: isUserExist.isSuperAdmin,
      },
    });
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
      data: {
        err: {
          generatedTime: new Date(),
          errMsg: err.stack,
          msg: err.message,
          type: err.name,
        },
      },
    });
  }
);

const updateUserProfile = catchAsync(
  async (req, res) => {
    const { name } = req.body;

    const user = await Users.findOne({ id: req.user.id });

    if (!user) {
      throw new AppError(`User does not found`, 404); // NJ-changes 13 Apr
    }

    // store data in DB
    user.name = name || user.name;

    const isSaved = await user.save();

    if (!isSaved) {
      throw new AppError(`User profile update fail`, 404); // NJ-changes 13 Apr
    }

    return res.status(200).json({
      message: "User details updated successfully!",
      name: isSaved.name,
      avatar: isSaved.image,
    });
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
      data: {
        err: {
          generatedTime: new Date(),
          errMsg: err.stack,
          msg: err.message,
          type: err.name,
        },
      },
    });
  }
);

const userForgetPassword = catchAsync(
  async (req, res) => {
    const { email } = req.body;

    const user = await Users.findOne({ email });

    if (!user) {
      throw new AppError(`Email does not exist!`, 404); // NJ-changes 13 Apr
    }

    const otp = makeId(6);

    // store email in ForgetPassword Model
    const store = await new ForgetPassword({
      email: user.email,
      otp,
      user: user._id,
    });

    const storeOTP = await store.save(store);
    if (!storeOTP) {
      res.status(500).json({
        status: 0,
        data: {
          err: {
            generatedTime: new Date(),
            errMsg: "Otp not send.",
            msg: "Otp not send.",
            type: "Internal ServerError",
          },
        },
      });
    }

    const url = `${otp}`;

    new Email(email, url).forgetPassword();

    return res
      .status(200)
      .json({ success: true, message: `Email send to you!` });
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
      data: {
        err: {
          generatedTime: new Date(),
          errMsg: err.stack,
          msg: err.message,
          type: err.name,
        },
      },
    });
  }
);

/**
 * @desc        Reset password
 * @Endpoint    Post @/api/users/resetPasemailsword
 * @access      Token access
 */
const resetForgetPassword = catchAsync(
  async (req, res) => {
    // look for email
    const { email } = req.body;
    if (!email) {
      throw new AppError(`Provide email`, 400); // NJ-changes 13 Apr
    }

    // destructure to otp and password
    const { otp, password, passwordVerify } = req.body;

    if (!otp || !password || !passwordVerify) {
      throw new AppError(`Enter all required fields.`, 400); // NJ-changes 13 Apr
    }

    if (password !== passwordVerify) {
      throw new AppError(`Make sure your password match.`, 401); // NJ-changes 13 Apr
    }

    // find user using email
    const user = await Users.findOne({ email });
    const fp = await ForgetPassword.findOne({ otp });

    if (!fp) {
      throw new AppError(`OTP does not exist!`, 404); // NJ-changes 13 Apr
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (isMatch) {
      throw new AppError(
        `You cannot set your previous password as new password, Enter new password!`,
        401
      ); // NJ-changes 13 Apr
    }

    if (user.email === fp.email) {
      // update password of user
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(password, salt);
      user.passwordHash = passwordHash;
      const saveUser = await user.save();
      if (!saveUser) {
        res.status(500).json({
          status: 0,
          data: {
            err: {
              generatedTime: new Date(),
              errMsg: "User not saved",
              msg: "User not saved",
              type: "MongodbError",
            },
          },
        });
      }

      // delete the document from forget password using email
      await ForgetPassword.deleteMany({ user: user._id });

      // SENDING FORGET MAIL USER

      // delete cookie email and other token
      return res.json({
        success: true,
        message: "password reset successfully",
      });
    } else {
      throw new AppError(`OTP does not match, try again!`, 401); // NJ-changes 13 Apr
    }
  },
  (err, res) => {
    return res.status(500).json({
      status: -1,
      data: {
        err: {
          generatedTime: new Date(),
          errMsg: err.message,
          msg: "Internal Server Error.",
          type: err.name,
        },
      },
    });
  }
);

const logoutUser = catchAsync(
  async (req, res) => {
    // const gettoken = req.headers["authorization"].split(" ")[1];
    await jwtr.destroy(req.jti);
    return res
      .status(200)
      .json({ status: 1, data: {}, message: "Logged out successfully!" });
    // return res.json({'message':'Logged out successfully!','token':token});
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
      data: {
        err: {
          generatedTime: new Date(),
          errMsg: err.stack,
          msg: err.message,
          type: err.name,
        },
      },
    });
  }
);

// update user profile
const userPasswordChange = catchAsync(
  async (req, res) => {
    var { currentPassword, newPassword } = req.body;
    // console.log(currentPassword);

    //  currentPassword could not be empty -----
    if (!currentPassword) {
      throw new AppError(`Current password should not be empty`, 400); // NJ-changes 13 Apr
    }
    //  new password could not be empty -----
    if (!newPassword) {
      throw new AppError(`new password should not be empty`, 400); // NJ-changes 13 Apr
    }
    //  new password should not match current password -----
    if (currentPassword === newPassword) {
      throw new AppError(`Current and New password should not be same`, 401); // NJ-changes 13 Apr
    }

    const user = await Users.findById(req.user);

    const salt = await bcrypt.genSalt();

    //  current password correct checking -----
    const passwordCompare = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!passwordCompare) {
      throw new AppError(`Current password is incorrect`, 401); // NJ-changes 13 Apr
    }
    // checking new password and hashing it
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = newPasswordHash;

    await user.save();

    return res
      .status(200)
      .json({ status: 1, data: {}, message: "Password changed successfully!" });
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
      data: {
        err: {
          generatedTime: new Date(),
          errMsg: err.stack,
          msg: err.message,
          type: err.name,
        },
      },
    });
  }
);

module.exports = {
  registerUser,
  loginUser,
  updateUserProfile,
  logoutUser,
  userForgetPassword,
  resetForgetPassword,
  userPasswordChange,
};

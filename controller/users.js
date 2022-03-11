const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");

const redis = require("redis");
const url = require("url");
const { sendEmail } = require("../helper/sendEmail");
const { createOtp } = require("../helper/helperFunctions");

const JWTR = require("jwt-redis").default;

const Users = require("../model/users");
const ForgetPassword = require("../model/forgetPassword");
const { ValidateEmail } = require("../helper/validatorMiddleware");
const { validationResult } = require("express-validator");
dotenv.config();

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
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const validateEmailId = ValidateEmail(email);
    if (password.length === 0)
      throw {
        status: 0,
        message: "Please enter password!",
      };

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    if (validateEmailId) {
      const user = await new Users({
        name,
        email,
        isSuperAdmin: false,
        passwordHash,
      });
      const savedUser = await user.save(user);

      if (savedUser) {
        res.status(201).json({
          status: 1,
          data: { name: savedUser.name },
          message: "Registration successfull!",
        });
      } else
        throw {
          status: 0,
          message: "some error happend during registration",
        };
    } else
      throw {
        status: 0,
        message: "Invalid email address.",
      };
  } catch (error) {
    if (error.code === 11000)
      res.status(409).json({
        status: 0,
        data: {
          err: {
            generatedTime: new Date(),
            errMsg: error.name,
            msg: error.message,
            type: "AccountExistError",
          },
        },
      });
    res.status(400).json({
      status: 0,
      data: {
        err: {
          generatedTime: new Date(),
          errMsg: error.name,
          msg: error.message,
          type: "RegisterError",
        },
      },
    });
  }
};

/**
 *
 * @param {email, password} req
 * @param {token} res
 * @api     POST @/api/logger/login
 */

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      throw {
        status: 0,
        message: "Email or password missing!",
        errorMessage: "Please enter required fields",
      };

    const validateEmail = ValidateEmail(email);

    if (!validateEmail)
      throw {
        status: 0,
        message: "Email invalid",
        errorMessage: "Email not valid",
      };

    // const errors = validationResult(req)
    // if(errors){
    //     return res.json({errors})
    // }

    const isUserExist = await Users.findOne({ email: email });

    if (!isUserExist)
      throw {
        status: 0,
        message: "User not available with this email address.",
        errorMessage: "User does not exist with this email!!",
      };

    const isPasswordCorrect = await bcrypt.compare(
      password,
      isUserExist.passwordHash
    );

    if (!isPasswordCorrect)
      throw {
        status: 0,
        message: "Password Incorrect",
        errorMessage: "Check Credentials",
      };

    // Token
    // const token = jwt.sign({
    //     user:isUserExist._id
    // },process.env.JWT_SECRET,{
    //     issuer: 'D&D tech',
    //     expiresIn: '1d'
    // });

    const id = { user: isUserExist._id };
    const token = await jwtr.sign(id, process.env.JWT_SECRET, {
      expiresIn: "15d",
    });

    // Assign token to http cookies
    return res.status(200).json({
      status: 1,
      message: `Logged In Successfull`,
      data: {
        token: token,
        name: isUserExist.name,
        isSuperAdmin: isUserExist.isSuperAdmin,
      },
    });
  } catch (error) {
    res.status(401).json({
      status: 0,
      data: {
        err: {
          generatedTime: new Date(),
          errMsg: error.name,
          msg: error.message,
          type: "NotFoundError",
        },
      },
    });
  }
};

const userForgetPassword = async (req, res) => {
  try {
    // if (req.cookies.token) throw "You are logged in, cannot make this request";

    const { email } = req.body;

    const user = await Users.findOne({ email });

    if (!user) throw "Email does not exist!";

    const otp = createOtp(6, false); //parameters: 1-> length of OTP, 2-> specialChars: boolean

    // store email in ForgetPassword Model
    const store = await new ForgetPassword({
      email: user.email,
      otp,
      user: user._id,
    });

    const storeOTP = await store.save(store);
    if (!storeOTP) throw "Some error occured in OTP store!";

    // send email -> inside helper folder
    sendEmail({ otp, to: email, msg: `Hello ${user.name}` });

    return res
      .status(200)
      .json({ success: true, message: `Email send to you!` });
  } catch (error) {
    return res
      .status(500)
      .json({ errormessage: `userForgetPassword ${error}` });
  }
};

/**
 * @desc        Reset password
 * @Endpoint    Post @/api/users/resetPassword
 * @access      Token access
 */
const resetForgetPassword = async (req, res) => {
  try {
    // if (req.cookies.token) throw "You are logged in, cannot make this request";
    // look for email
    // const email = req.cookies.email;
    const { email } = req.body;
    if (!email) throw "Provide email";

    // destructure to otp and password
    const { otp, password, passwordVerify } = req.body;

    if (!otp || !password || !passwordVerify)
      throw "Enter all required fields.";

    if (password !== passwordVerify) throw "Make sure your password match.";

    // find user using email
    const user = await Users.findOne({ email });
    const fp = await ForgetPassword.findOne({ otp });

    if (!fp) throw "OTP does not exist!";

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (isMatch)
      throw "You cannot set your previous password as new password, Enter new password!";

    if (user.email === fp.email) {
      // update password of user
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(password, salt);
      user.passwordHash = passwordHash;
      await user.save();

      // delete the document from forget password using email
      await ForgetPassword.deleteMany({ user: user._id });

      // delete cookie email and other token
      return (
        res
          // .json("email", "", {
          //   expires: new Date(0), // Date(0) means it set to 1/Jan/1970 00:00:00 hr.
          // })
          .json({ success: true, message: "password reset successfully" })
      );
    } else {
      throw "OTP does not match, try again!";
    }
  } catch (error) {
    return res
      .status(500)
      .json({ errormessage: `resetForgetPassword ${error}` });
  }
};

const logoutUser = async (req, res) => {
  try {
    const gettoken = req.headers["authorization"].split(" ")[1];
    const result = await jwtr.destroy(req.jti);
    return res
      .status(200)
      .json({ status: 1, data: {}, message: "Logged out successfully!" });
    // return res.json({'message':'Logged out successfully!','token':token});
  } catch (error) {
    if (process.env.NODE_ENV == "DEVELOPMENT") {
      console.log(error);
    }
    return res.status(500).json({
      status: 0,
      data: {
        err: {
          generatedTime: new Date(),
          errMsg: error.name,
          msg: error.message,
          type: "LogoutError",
        },
      },
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  userForgetPassword,
  resetForgetPassword,
};

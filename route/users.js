const express = require("express");
const router = express.Router();

const { check } = require("express-validator");

const {
    registerUser,
    loginUser,
    updateUserProfile,
    logoutUser,
    userForgetPassword,
    resetForgetPassword,
    userPasswordChagne,
} = require('../controller/users.js')

const {
    authUser
} = require('../middleware/authenticate')

const middlewares = [check('email').isEmail().normalizeEmail(), check('password').trim().isLength(5)]
// Unprotected
router.post('/login', loginUser)
router.post('/register',registerUser)

// router.get('/login',(req,res)=>res.send("req receive successfully!!!"))

router.post("/forget", userForgetPassword);

// Token access
router.post("/resetPassword", resetForgetPassword);

// Protected

router.get('/logout',authUser,logoutUser)
router.put('/update',authUser,updateUserProfile)
router.put("/changepassword", authUser, userPasswordChagne);


module.exports = router;

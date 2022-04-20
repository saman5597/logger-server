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

// AUTH Route
// Unprotected
router.post('/auth/login', loginUser)
router.post('/auth/register',registerUser)
router.post("/auth/forget", userForgetPassword);

// Token access
router.post("/auth/resetPassword", resetForgetPassword);

// Protected
router.get('/auth/logout',authUser,logoutUser)

// USERS Route
// Protected Route
router.put('/users/update',authUser,updateUserProfile)
router.put("/users/changepassword", authUser, userPasswordChagne);

module.exports = router;

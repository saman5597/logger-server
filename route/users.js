const express = require("express");
const router = express.Router();


const {
    registerUser,
    loginUser,
    updateUserProfile,
    logoutUser,
    userForgetPassword,
    resetForgetPassword,
    userPasswordChange,
    getUserByUserId
} = require('../controller/users.js')

const {
    isAuth
} = require('../middleware/authMiddleware');
const { profileCache } = require("../middleware/cache.js");

// AUTH Route
// Unprotected
router.post('/auth/login', loginUser)
router.post('/auth/register',registerUser)
router.post("/auth/forget", userForgetPassword);

// Token access
router.post("/auth/resetPassword", resetForgetPassword);

// Protected
router.get('/auth/logout',isAuth,logoutUser)

// USERS Route
// Protected Route
router.get('/users', isAuth, profileCache(10), getUserByUserId)
router.put('/users/update',isAuth,updateUserProfile)
router.put("/users/changepassword", isAuth, userPasswordChange);

module.exports = router;

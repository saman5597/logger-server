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
} = require('../controller/users.js')

const {
    isAuth
} = require('../middleware/authMiddleware')


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
router.put('/users/update',isAuth,updateUserProfile)
router.put("/users/changepassword", isAuth, userPasswordChange);

module.exports = router;

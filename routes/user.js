const express = require('express');
const router = express.Router();
const User = require('../models/user.js');
const wrapAsync = require('../utlis/wrapAsync.js');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const { saveRedirectUrl, isLoggedIn } = require('../middleware.js');

const userController = require('../controllers/users.js');

// Limits brute-force attacks on login: 30 attempts per IP every 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        req.flash("error", "Too many login attempts. Please wait a few minutes and try again.");
        res.redirect("/login");
    },
});

router.route("/signup")
    .get(userController.renderSignupForm)
    .post(wrapAsync(userController.signup));


router.route("/login")
    .get(userController.renderLoginForm)
    .post(
        loginLimiter,
        saveRedirectUrl,
        passport.authenticate("local", {
            failureRedirect: "/login",
            failureFlash: true
        }),
        userController.login
    );


router.get("/logout", userController.logout);

// Forgot / reset password (unverified — see security note in controller)
router.route("/forgot-password")
    .get(userController.renderForgotPasswordForm)
    .post(wrapAsync(userController.forgotPassword));

router.route("/reset-password")
    .get(userController.renderResetPasswordForm)
    .post(wrapAsync(userController.resetPassword));

module.exports = router;
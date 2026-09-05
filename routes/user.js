const express = require('express');
const router = express.Router();
const User = require('../models/user.js');
const wrapAsync = require('../utlis/wrapAsync.js');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const { saveRedirectUrl, isLoggedIn } = require('../middleware.js');

const userController = require('../controllers/users.js');

// Only login gets a rate limiter (protects against password brute-forcing).
// Signup/forgot-password/reset-password/verify-email are left unlimited
// since they don't gain an attacker anything by brute-forcing, and a limiter
// there just gets in the way of normal testing.
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

// Email verification (OTP-based)
router.route("/verify-email")
    .get(userController.renderVerifyEmailForm)
    .post(wrapAsync(userController.verifyEmail));

router.post("/resend-verification", wrapAsync(userController.resendVerificationEmail));

// Forgot / reset password
router.route("/forgot-password")
    .get(userController.renderForgotPasswordForm)
    .post(wrapAsync(userController.forgotPassword));

router.route("/reset-password")
    .get(userController.renderResetPasswordForm)
    .post(wrapAsync(userController.resetPassword));

module.exports = router;
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

// OTP Verification Routes
router.route("/verify-otp")
    .get(userController.renderVerifyOtpForm)
    .post(wrapAsync(userController.verifyOtp));

router.post("/resend-otp", wrapAsync(userController.resendOtp));

// Google OAuth Authentication
router.get("/auth/google", (req, res, next) => {
    const hasGoogle = Boolean(
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        !process.env.GOOGLE_CLIENT_SECRET.includes("<")
    );

    if (!hasGoogle) {
        req.flash("error", "Google Sign-In is not configured yet. Please update GOOGLE_CLIENT_SECRET in .env file.");
        return res.redirect("/login");
    }

    if (req.query.redirect) {
        req.session.redirectUrl = req.query.redirect;
    }
    passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" })(req, res, next);
});

router.get("/auth/google/callback", (req, res, next) => {
    passport.authenticate("google", {
        failureRedirect: "/login",
        failureFlash: "Failed to sign in with Google. Please try again."
    }, (err, user, info) => {
        if (err || !user) {
            req.flash("error", (err && err.message) || (info && info.message) || "Google sign-in could not be completed.");
            return res.redirect("/login");
        }
        req.login(user, (loginErr) => {
            if (loginErr) return next(loginErr);
            req.flash("success", `Welcome to StayHub, ${user.username}!`);
            const redirectUrl = req.session.redirectUrl || "/listings";
            delete req.session.redirectUrl;
            res.redirect(redirectUrl);
        });
    })(req, res, next);
});

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

// Profile page
router.route("/profile")
    .get(isLoggedIn, wrapAsync(userController.renderProfile))
    .post(isLoggedIn, wrapAsync(userController.updateProfile))
    .put(isLoggedIn, wrapAsync(userController.updateProfile));

// Forgot / reset password (unverified — see security note in controller)
router.route("/forgot-password")
    .get(userController.renderForgotPasswordForm)
    .post(wrapAsync(userController.forgotPassword));

router.route("/reset-password")
    .get(userController.renderResetPasswordForm)
    .post(wrapAsync(userController.resetPassword));

module.exports = router;
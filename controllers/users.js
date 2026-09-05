// const User = require('../models/user.js');
// const crypto = require('crypto');
// const { sendVerificationEmail, sendResetPasswordEmail } = require('../utlis/sendEmail.js');

// function generateOtp() {
//     return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
// }

// module.exports.renderSignupForm = (req, res) => {
//     res.render("users/signup.ejs");
// };

// module.exports.signup = async (req, res, next) => {
//     try {
//         let { username, email, password } = req.body;

//         const newUser = new User({ email, username });

//         // Email verification OTP (valid for 10 minutes)
//         const otp = generateOtp();
//         newUser.emailOtp = otp;
//         newUser.emailOtpExpires = Date.now() + 10 * 60 * 1000;

//         const registeredUser = await User.register(newUser, password);

//         // Try sending the real verification email. If email isn't configured
//         // (no EMAIL_USER/EMAIL_PASS in .env), don't block signup — just warn in the console.
//         try {
//             await sendVerificationEmail(email, otp);
//         } catch (mailErr) {
//             console.log("Email not sent (check EMAIL_USER/EMAIL_PASS in .env):", mailErr.message);
//         }

//         // Do NOT log them in yet — they must verify their email first
//         req.session.pendingVerificationEmail = email;
//         req.flash('success', 'Account created! Enter the code we emailed you to verify your account.');
//         res.redirect("/verify-email");
//     } catch (e) {
//         req.flash('error', e.message);
//         res.redirect("/signup");
//     }
// };

// module.exports.renderLoginForm = (req, res) => {
//     if (req.query.redirect) {
//         req.session.redirectUrl = req.query.redirect;
//     }
//     res.render("users/login.ejs");
// };

// module.exports.login = async (req, res) => {
//     if (!req.user.isEmailVerified) {
//         const email = req.user.email;
//         req.logout(() => {
//             req.session.pendingVerificationEmail = email;
//             req.flash("error", "Please verify your email before logging in.");
//             res.redirect("/verify-email");
//         });
//         return;
//     }

//     req.flash('success', 'Welcome back to StayHub');
//     let redirectUrl = res.locals.redirectUrl || "/listings";
//     res.redirect(redirectUrl);
// };

// module.exports.logout = (req, res, next) => {
//     req.logout((err) => {
//         if (err) {
//             return next(err);
//         }
//         req.flash("success", "Good Bye!!.....    you are logged out!");
//         res.redirect("/listings");
//     });
// };

// // ---------------- EMAIL VERIFICATION (OTP-based) ----------------

// module.exports.renderVerifyEmailForm = (req, res) => {
//     res.render("users/verify-email.ejs", {
//         prefillEmail: req.session.pendingVerificationEmail || "",
//     });
// };

// module.exports.verifyEmail = async (req, res) => {
//     const { email, otp } = req.body;

//     const user = await User.findOne({
//         email,
//         emailOtp: otp,
//         emailOtpExpires: { $gt: Date.now() },
//     });

//     if (!user) {
//         req.flash("error", "Incorrect or expired code. Please try again or resend the code.");
//         return res.redirect("/verify-email");
//     }

//     user.isEmailVerified = true;
//     user.emailOtp = undefined;
//     user.emailOtpExpires = undefined;
//     await user.save();

//     req.session.pendingVerificationEmail = undefined;
//     req.flash("success", "Email verified successfully! You can now log in.");
//     res.redirect("/login");
// };

// module.exports.resendVerificationEmail = async (req, res) => {
//     let user;

//     if (req.user) {
//         user = req.user;
//     } else {
//         const email = req.body.email || req.session.pendingVerificationEmail;
//         if (!email) {
//             req.flash("error", "Please enter your email.");
//             return res.redirect("/verify-email");
//         }
//         user = await User.findOne({ email });
//     }

//     if (!user) {
//         req.flash("error", "No account found with that email.");
//         return res.redirect("/verify-email");
//     }

//     if (user.isEmailVerified) {
//         req.flash("success", "This email is already verified. You can log in.");
//         return res.redirect("/login");
//     }

//     const otp = generateOtp();
//     user.emailOtp = otp;
//     user.emailOtpExpires = Date.now() + 10 * 60 * 1000;
//     await user.save();

//     try {
//         await sendVerificationEmail(user.email, otp);
//         req.flash("success", "A new code has been sent — check your inbox.");
//     } catch (mailErr) {
//         req.flash("error", "Could not send email. Check EMAIL_USER/EMAIL_PASS in .env.");
//     }

//     req.session.pendingVerificationEmail = user.email;
//     res.redirect(req.user ? "/listings" : "/verify-email");
// };

// // ---------------- FORGOT / RESET PASSWORD ----------------

// module.exports.renderForgotPasswordForm = (req, res) => {
//     res.render("users/forgot-password.ejs");
// };

// module.exports.forgotPassword = async (req, res) => {
//     const { email } = req.body;
//     const user = await User.findOne({ email });

//     // Same message whether or not the email exists — avoids leaking which emails are registered
//     const genericMsg = "If that email is registered, a reset link has been sent to it.";

//     if (!user) {
//         req.flash("success", genericMsg);
//         return res.redirect("/forgot-password");
//     }

//     const resetToken = crypto.randomBytes(32).toString("hex");
//     user.resetPasswordToken = resetToken;
//     user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
//     await user.save();

//     try {
//         const baseUrl = `${req.protocol}://${req.get("host")}`;
//         await sendResetPasswordEmail(user.email, resetToken, baseUrl);
//     } catch (mailErr) {
//         console.log("Reset email not sent (check EMAIL_USER/EMAIL_PASS in .env):", mailErr.message);
//     }

//     req.flash("success", genericMsg);
//     res.redirect("/forgot-password");
// };

// module.exports.renderResetPasswordForm = async (req, res) => {
//     const { token } = req.params;

//     const user = await User.findOne({
//         resetPasswordToken: token,
//         resetPasswordExpires: { $gt: Date.now() },
//     });

//     if (!user) {
//         req.flash("error", "Reset link is invalid or has expired. Please request a new one.");
//         return res.redirect("/forgot-password");
//     }

//     res.render("users/reset-password.ejs", { token });
// };

// module.exports.resetPassword = async (req, res) => {
//     const { token } = req.params;
//     const { password } = req.body;

//     const user = await User.findOne({
//         resetPasswordToken: token,
//         resetPasswordExpires: { $gt: Date.now() },
//     });

//     if (!user) {
//         req.flash("error", "Reset link is invalid or has expired. Please request a new one.");
//         return res.redirect("/forgot-password");
//     }

//     // setPassword (passport-local-mongoose v9+) is Promise-based — no callback
//     await user.setPassword(password);

//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpires = undefined;
//     await user.save();

//     req.flash("success", "Password reset successfully! You can now log in.");
//     res.redirect("/login");
// };

const User = require('../models/user.js');
const crypto = require('crypto');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../utlis/sendEmail.js');

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
    try {
        let { username, email, password } = req.body;

        const newUser = new User({ email, username });

        const otp = generateOtp();
        newUser.emailOtp = otp;
        newUser.emailOtpExpires = Date.now() + 10 * 60 * 1000;

        const registeredUser = await User.register(newUser, password);

        try {
            await sendVerificationEmail(email, otp);
        } catch (mailErr) {
            console.log("Email not sent (check EMAIL_USER/EMAIL_PASS in .env):", mailErr.message);
        }

        req.session.pendingVerificationEmail = email;
        req.flash('success', 'Account created! Enter the code we emailed you to verify your account.');
        res.redirect("/verify-email");
    } catch (e) {
        req.flash('error', e.message);
        res.redirect("/signup");
    }
};

module.exports.renderLoginForm = (req, res) => {
    if (req.query.redirect) {
        req.session.redirectUrl = req.query.redirect;
    }
    res.render("users/login.ejs");
};

module.exports.login = async (req, res) => {
    if (!req.user.isEmailVerified) {
        const email = req.user.email;
        req.logout(() => {
            req.session.pendingVerificationEmail = email;
            req.flash("error", "Please verify your email before logging in.");
            res.redirect("/verify-email");
        });
        return;
    }

    req.flash('success', 'Welcome back to StayHub');
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "Good Bye!!.....    you are logged out!");
        res.redirect("/listings");
    });
};

// ---------------- EMAIL VERIFICATION (OTP-based) ----------------

module.exports.renderVerifyEmailForm = (req, res) => {
    res.render("users/verify-email.ejs", {
        prefillEmail: req.session.pendingVerificationEmail || "",
    });
};

module.exports.verifyEmail = async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({
        email,
        emailOtp: otp,
        emailOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
        req.flash("error", "Incorrect or expired code. Please try again or resend the code.");
        return res.redirect("/verify-email");
    }

    user.isEmailVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpires = undefined;
    await user.save();

    req.session.pendingVerificationEmail = undefined;
    req.flash("success", "Email verified successfully! You can now log in.");
    res.redirect("/login");
};

module.exports.resendVerificationEmail = async (req, res) => {
    let user;

    if (req.user) {
        user = req.user;
    } else {
        const email = req.body.email || req.session.pendingVerificationEmail;
        if (!email) {
            req.flash("error", "Please enter your email.");
            return res.redirect("/verify-email");
        }
        user = await User.findOne({ email });
    }

    if (!user) {
        req.flash("error", "No account found with that email.");
        return res.redirect("/verify-email");
    }

    if (user.isEmailVerified) {
        req.flash("success", "This email is already verified. You can log in.");
        return res.redirect("/login");
    }

    const otp = generateOtp();
    user.emailOtp = otp;
    user.emailOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
        await sendVerificationEmail(user.email, otp);
        req.flash("success", "A new code has been sent — check your inbox.");
    } catch (mailErr) {
        req.flash("error", "Could not send email. Check EMAIL_USER/EMAIL_PASS in .env.");
    }

    req.session.pendingVerificationEmail = user.email;
    res.redirect(req.user ? "/listings" : "/verify-email");
};

// ---------------- FORGOT / RESET PASSWORD (OTP-based) ----------------

module.exports.renderForgotPasswordForm = (req, res) => {
    res.render("users/forgot-password.ejs");
};

module.exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    const genericMsg = "If that email is registered, a code has been sent to it.";

    if (!user) {
        req.flash("success", genericMsg);
        return res.redirect("/forgot-password");
    }

    const otp = generateOtp();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
        await sendResetPasswordEmail(user.email, otp);
    } catch (mailErr) {
        console.log("Reset email not sent (check EMAIL_USER/EMAIL_PASS in .env):", mailErr.message);
    }

    req.session.pendingResetEmail = email;
    req.flash("success", genericMsg);
    res.redirect("/reset-password");
};

module.exports.renderResetPasswordForm = (req, res) => {
    res.render("users/reset-password.ejs", {
        prefillEmail: req.session.pendingResetEmail || "",
    });
};

module.exports.resetPassword = async (req, res) => {
    const { email, otp, password } = req.body;

    const user = await User.findOne({
        email,
        resetPasswordOtp: otp,
        resetPasswordOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
        req.flash("error", "Incorrect or expired code. Please try again or request a new one.");
        return res.redirect("/reset-password");
    }

    // setPassword (passport-local-mongoose v9+) is Promise-based — no callback
    await user.setPassword(password);

    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    req.session.pendingResetEmail = undefined;
    req.flash("success", "Password reset successfully! You can now log in.");
    res.redirect("/login");
};
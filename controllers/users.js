const User = require('../models/user.js');
const { isRealEmailDomain } = require('../utlis/emailValidator.js');

module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
    try {
        let { username, email, password } = req.body;

        const validDomain = await isRealEmailDomain(email);
        if (!validDomain) {
            req.flash('error', "That email address doesn't look real — please check for typos (e.g. gmial.com instead of gmail.com).");
            return res.redirect("/signup");
        }

        const newUser = new User({ email, username });
        const registeredUser = await User.register(newUser, password);

        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash('success', 'Welcome to StayHub!');
            res.redirect("/listings");
        });
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

// ---------------- FORGOT / RESET PASSWORD ----------------
// ⚠️ SECURITY NOTE: This flow does NOT verify that the requester owns the
// email address (no OTP/link is sent to prove inbox access). Anyone who
// knows a user's email can reset that user's password. This is acceptable
// for a demo/practice project only — do NOT use this pattern in a real
// production app. A production app should always verify ownership via a
// one-time code or link sent to the actual inbox before allowing a reset.

module.exports.renderForgotPasswordForm = (req, res) => {
    res.render("users/forgot-password.ejs");
};

module.exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        req.flash("error", "No account found with that email.");
        return res.redirect("/forgot-password");
    }

    res.redirect(`/reset-password?email=${encodeURIComponent(email)}`);
};

module.exports.renderResetPasswordForm = (req, res) => {
    const email = req.query.email || "";
    res.render("users/reset-password.ejs", { prefillEmail: email });
};

module.exports.resetPassword = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        req.flash("error", "No account found with that email.");
        return res.redirect("/forgot-password");
    }

    // setPassword (passport-local-mongoose v9+) is Promise-based — no callback
    await user.setPassword(password);
    await user.save();

    req.flash("success", "Password reset successfully! You can now log in.");
    res.redirect("/login");
};
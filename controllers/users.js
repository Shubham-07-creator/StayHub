const User = require('../models/user.js');
const Booking = require('../models/booking.js');
const Listing = require('../models/listing.js');
const Review = require('../models/review.js');
const { isRealEmailDomain } = require('../utlis/emailValidator.js');
const { sendSignupOtpEmail } = require('../utlis/sendEmail.js');

module.exports.renderSignupForm = (req, res) => {
    if (req.user) {
        return res.redirect("/listings");
    }
    res.render("users/signup.ejs");
};

// 1. Initiate Signup -> Validate, generate OTP, send email, redirect to verify-otp
module.exports.signup = async (req, res, next) => {
    try {
        let { username, email, phone, dob, pincode, country, state, district, password } = req.body;

        email = email ? email.trim().toLowerCase() : "";

        // Check if real email domain
        const validDomain = await isRealEmailDomain(email);
        if (!validDomain) {
            req.flash('error', "That email address doesn't look real — please check for typos (e.g. gmial.com instead of gmail.com).");
            return res.redirect("/signup");
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', "An account with this email address already exists. Please log in.");
            return res.redirect("/login");
        }

        // Generate 6-digit OTP code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save pending signup data in session
        req.session.pendingSignup = {
            username: username.trim(),
            email,
            phone: phone ? phone.trim() : "",
            dob,
            pincode: pincode ? pincode.trim() : "",
            country: country ? country.trim() : "India",
            state: state ? state.trim() : "",
            district: district ? district.trim() : "",
            password,
            otp,
            otpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
            sentAt: Date.now(),
        };

        // Send OTP via Email
        await sendSignupOtpEmail(email, otp, username.trim());

        req.flash('success', `Verification code sent to ${email}! Enter the 6-digit code to complete registration.`);
        res.redirect("/verify-otp");
    } catch (e) {
        console.error("Signup error:", e);
        req.flash('error', e.message || "Failed to process signup. Please try again.");
        res.redirect("/signup");
    }
};

// 2. Render OTP Verification Form
module.exports.renderVerifyOtpForm = (req, res) => {
    if (req.user) {
        return res.redirect("/listings");
    }
    if (!req.session.pendingSignup) {
        req.flash('error', "Please fill out the signup form first.");
        return res.redirect("/signup");
    }
    res.render("users/verify-otp.ejs", {
        email: req.session.pendingSignup.email,
        username: req.session.pendingSignup.username,
    });
};

// 3. Verify OTP & Finalize Account Registration
module.exports.verifyOtp = async (req, res, next) => {
    try {
        if (!req.session.pendingSignup) {
            req.flash('error', "Your session has expired. Please sign up again.");
            return res.redirect("/signup");
        }

        const submittedOtp = (req.body.otp || '').toString().trim();
        const { otp, otpExpires, username, email, phone, dob, pincode, country, state, district, password } = req.session.pendingSignup;

        if (!submittedOtp || submittedOtp.length !== 6) {
            req.flash('error', "Please enter the complete 6-digit verification code.");
            return res.redirect("/verify-otp");
        }

        if (Date.now() > otpExpires) {
            req.flash('error', "Verification code has expired. Please request a new code.");
            return res.redirect("/verify-otp");
        }

        if (submittedOtp !== otp) {
            req.flash('error', "Incorrect verification code. Please check your email and try again.");
            return res.redirect("/verify-otp");
        }

        // Secondary check for duplicate email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            delete req.session.pendingSignup;
            req.flash('error', "An account with this email already exists. Please log in.");
            return res.redirect("/login");
        }

        // Create verified user
        const newUser = new User({
            username,
            email,
            phone,
            dob,
            pincode,
            country,
            state,
            district,
            authProvider: "local",
            isEmailVerified: true,
        });

        const registeredUser = await User.register(newUser, password);
        delete req.session.pendingSignup;

        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.flash('success', `Welcome to StayHub, ${registeredUser.username}! Your account has been verified and created.`);
            let redirectUrl = res.locals.redirectUrl || req.session.redirectUrl || "/listings";
            delete req.session.redirectUrl;
            res.redirect(redirectUrl);
        });
    } catch (e) {
        console.error("OTP verification error:", e);
        req.flash('error', e.message || "Failed to verify code. Please try again.");
        res.redirect("/verify-otp");
    }
};

// 4. Resend OTP Code
module.exports.resendOtp = async (req, res) => {
    try {
        if (!req.session.pendingSignup) {
            req.flash('error', "No pending signup found. Please sign up first.");
            return res.redirect("/signup");
        }

        const now = Date.now();
        if (req.session.pendingSignup.sentAt && (now - req.session.pendingSignup.sentAt < 30000)) {
            const secondsLeft = Math.ceil((30000 - (now - req.session.pendingSignup.sentAt)) / 1000);
            req.flash('error', `Please wait ${secondsLeft} seconds before requesting another code.`);
            return res.redirect("/verify-otp");
        }

        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        req.session.pendingSignup.otp = newOtp;
        req.session.pendingSignup.otpExpires = now + 10 * 60 * 1000;
        req.session.pendingSignup.sentAt = now;

        await sendSignupOtpEmail(
            req.session.pendingSignup.email,
            newOtp,
            req.session.pendingSignup.username
        );

        req.flash('success', "A new verification code has been sent to your email.");
        res.redirect("/verify-otp");
    } catch (e) {
        console.error("Resend OTP error:", e);
        req.flash('error', `Could not resend email: ${e.message}`);
        res.redirect("/verify-otp");
    }
};

module.exports.renderLoginForm = (req, res) => {
    if (req.query.redirect) {
        req.session.redirectUrl = req.query.redirect;
    }
    if (req.query.msg === "wishlist") {
        req.flash("error", "Please log in to save properties to your wishlist.");
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

// ---------------- PROFILE ----------------

function calculateAge(dob) {
    if (!dob) return null;
    const diffMs = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

module.exports.renderProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const [bookingsCount, listingsCount, reviewsCount, recentBookings] = await Promise.all([
            Booking.countDocuments({ user: userId }),
            Listing.countDocuments({ owner: userId }),
            Review.countDocuments({ author: userId }),
            Booking.find({ user: userId })
                .sort({ _id: -1 })
                .limit(4)
                .populate("listing")
                .lean()
        ]);

        const memberSince = req.user._id
            ? new Date(req.user._id.getTimestamp()).toLocaleDateString("en-US", { month: "short", year: "numeric" })
            : "Recently";

        res.render("users/profile.ejs", {
            user: req.user,
            age: calculateAge(req.user.dob),
            stats: {
                bookings: bookingsCount || 0,
                listings: listingsCount || 0,
                reviews: reviewsCount || 0,
                wishlist: (req.user.wishlist && req.user.wishlist.length) || 0,
                memberSince,
            },
            recentBookings: recentBookings || []
        });
    } catch (err) {
        console.error("Profile load error:", err);
        res.render("users/profile.ejs", {
            user: req.user,
            age: calculateAge(req.user.dob),
            stats: {
                bookings: 0,
                listings: 0,
                reviews: 0,
                wishlist: (req.user.wishlist && req.user.wishlist.length) || 0,
                memberSince: "Recently",
            },
            recentBookings: []
        });
    }
};

module.exports.updateProfile = async (req, res) => {
    try {
        const { username, phone, dob, pincode, district, state, country } = req.body;
        const updateData = {
            username: username ? username.trim() : req.user.username,
            phone: phone ? phone.trim() : "",
            pincode: pincode ? pincode.trim() : "",
            district: district ? district.trim() : "",
            state: state ? state.trim() : "",
            country: country ? country.trim() : "India"
        };

        if (dob) {
            const parsedDob = new Date(dob);
            if (!isNaN(parsedDob.getTime())) {
                updateData.dob = parsedDob;
            }
        }

        await User.findByIdAndUpdate(req.user._id, updateData);
        req.flash("success", "Profile updated successfully!");
        res.redirect("/profile");
    } catch (err) {
        console.error("Update profile error:", err);
        req.flash("error", "Failed to update profile: " + err.message);
        res.redirect("/profile");
    }
};

// ---------------- FORGOT / RESET PASSWORD ----------------
// ⚠️ SECURITY NOTE: This flow does NOT verify that the requester owns the
// email address (no OTP/link is sent to prove inbox access). Anyone who
// knows a user's email can reset that user's password. This is acceptable
// for a demo/practice project only — do NOT use this pattern in a real
// production app.

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
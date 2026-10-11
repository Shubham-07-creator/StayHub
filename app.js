if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

const express = require('express');
const app = express();
app.set('trust proxy', 1);
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const ExpressError = require("./utlis/ExpressError.js");
const session = require('express-session');
const MongoStore = require("connect-mongo").default;
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/user.js');

const compression = require('compression');

const listingRouter = require('./routes/listing.js');
const reviewRouter = require('./routes/review.js');
const userRouter = require('./routes/user.js');
const bookingRouter = require('./routes/booking.js');
const adminRouter = require('./routes/admin.js');
const wishlistRouter = require('./routes/wishlist.js');

const dbUrl = process.env.ATLASDB_URL;

main()
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
});

mongoose.connection.on('error', (err) => {
    console.warn('MongoDB connection warning:', err.message);
});
mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Mongoose will automatically reconnect.');
});

async function main() {
    await mongoose.connect(dbUrl, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
    });
}

app.use(compression());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());    
app.use(methodOverride('_method'));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '7d',
    etag: true
}));

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({ usernameField: "email" }, User.authenticate()));

// Google OAuth Strategy
const hasGoogleCreds = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    !process.env.GOOGLE_CLIENT_SECRET.includes("<")
);

if (hasGoogleCreds) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
        proxy: true
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = (profile.emails && profile.emails[0] && profile.emails[0].value)
                ? profile.emails[0].value.toLowerCase().trim()
                : null;

            if (!email) {
                return done(new Error("No email found in your Google account"), null);
            }

            // 1. Existing user with matching googleId
            let user = await User.findOne({ googleId: profile.id });
            if (user) {
                return done(null, user);
            }

            // 2. Existing user with matching email -> link Google account
            user = await User.findOne({ email });
            if (user) {
                user.googleId = profile.id;
                user.authProvider = "google";
                if (!user.avatar && profile.photos && profile.photos[0]) {
                    user.avatar = profile.photos[0].value;
                }
                user.isEmailVerified = true;
                await user.save();
                return done(null, user);
            }

            // 3. New user registration via Google OAuth
            const username = profile.displayName || email.split("@")[0];
            const avatar = (profile.photos && profile.photos[0]) ? profile.photos[0].value : "";

            user = new User({
                email,
                username,
                googleId: profile.id,
                authProvider: "google",
                avatar,
                isEmailVerified: true
            });
            await user.save();
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));
}

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "shubhamkumar979883@gmail.com";

app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currUser = req.user;
    res.locals.isAdmin = Boolean(req.user && req.user.email === ADMIN_EMAIL);
    res.locals.userWishlist = (req.user && Array.isArray(req.user.wishlist))
        ? req.user.wishlist.map(id => id.toString())
        : [];
    next();
});

// High-speed ping & healthcheck endpoints (used by uptime monitors & Render)
app.get("/ping", (req, res) => res.status(200).send("pong"));
app.get("/health", (req, res) => res.status(200).json({ status: "ok", uptime: process.uptime() }));

app.get("/", (req, res) => {
    res.redirect("/listings");
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/admin", adminRouter);
app.use("/wishlist", wishlistRouter);
app.use("/", userRouter);
app.use("/", bookingRouter);


app.all(/.*/, (req, res, next) => {
    next(new ExpressError(404, "page not found"));
})

app.use((err, req, res, next) => {
    let {statusCode = 500, message = "something went wrong"} = err;
    res.status(statusCode).render("error.ejs", {message});
    // res.status(statusCode).send(message);
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    // Automatic Keep-Alive for Render Free Tier (Prevents 15-minute Sleep Mode / Cold Starts)
    const renderUrl = process.env.RENDER_EXTERNAL_URL;
    if (renderUrl) {
        const https = require("https");
        console.log(`[Keep-Alive] Initialized self-ping service for Render: ${renderUrl}`);
        // Ping every 13 minutes (Render free tier sleeps after 15 minutes of inactivity)
        setInterval(() => {
            https.get(`${renderUrl}/ping`, (res) => {
                // Heartbeat successful
            }).on("error", (err) => {
                console.error("[Keep-Alive] Heartbeat error:", err.message);
            });
        }, 13 * 60 * 1000);
    }
});
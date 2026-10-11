const Listing = require("./models/listing");
const Review = require("./models/review");
const Booking = require("./models/booking");
const ExpressError = require("./utlis/ExpressError");
const { listingSchema, reviewSchema, bookingSchema } = require("./schema.js");

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        const isApiOrAjax = req.xhr || 
            (req.headers.accept && req.headers.accept.includes("json")) || 
            req.is("json") || 
            req.path.includes("create-order");

        if (isApiOrAjax) {
            return res.status(401).json({ 
                error: "Please log in to proceed with your booking.",
                requireLogin: true,
                redirectUrl: "/login"
            });
        }

        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in to access that page");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;   
    }
    next();
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "shubhamkumar979883@gmail.com";

module.exports.ADMIN_EMAIL = ADMIN_EMAIL;

module.exports.isAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in as Admin to perform this action");
        return res.redirect("/login");
    }
    if (req.user.email !== ADMIN_EMAIL) {
        req.flash("error", "Access denied: Only Admin can add, edit, or delete listings");
        return res.redirect("/listings");
    }
    next();
};

module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }
    const isUserAdmin = req.user && req.user.email === ADMIN_EMAIL;
    if (!listing.owner.equals(res.locals.currUser._id) && !isUserAdmin) {
        req.flash("error", "You are not authorized for this listing");
        return res.redirect(`/listings/${id}`);
    }
    next();
};


module.exports.validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};


module.exports.validateReview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};


module.exports.validateBooking = (req, res, next) => {
    let { error } = bookingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(", ");
        const isApiOrAjax = req.xhr || 
            (req.headers.accept && req.headers.accept.includes("json")) || 
            req.is("json") || 
            req.path.includes("create-order");

        if (isApiOrAjax) {
            return res.status(400).json({ error: errMsg });
        }
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};


module.exports.isBookingOwner = async (req, res, next) => {
    let { bookingId } = req.params;
    const booking = await Booking.findById(bookingId).populate("listing");
    if (!booking) {
        req.flash("error", "Booking not found");
        return res.redirect("/bookings");
    }

    const isGuest = booking.user && booking.user.equals(res.locals.currUser._id);
    const isHost = booking.listing && booking.listing.owner && booking.listing.owner.equals(res.locals.currUser._id);
    const isAdmin = Boolean(res.locals.isAdmin);

    // If viewing the booking / invoice (GET)
    if (req.method === "GET") {
        if (!isGuest && !isHost && !isAdmin) {
            req.flash("error", "You do not have permission to view this reservation invoice.");
            return res.redirect("/bookings");
        }
        return next();
    }

    // If cancelling the booking (DELETE)
    if (!isGuest && !isAdmin) {
        req.flash("error", "You are not authorized to cancel this booking.");
        return res.redirect("/bookings");
    }
    next();
};


module.exports.isReviewAuthor = async (req, res, next) => {
    let { id, reviewId } = req.params;
    let review = await Review.findById(reviewId);
    if (!review.author.equals(res.locals.currUser._id)) {
        req.flash("error", "You are not the author of this review");
        return res.redirect(`/listings/${id}`);
    }
    next();
};

const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const Booking = require("../models/booking.js");

module.exports.createReview = async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    if (!listing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }

    // Only allow reviews from users who actually booked this stay
    const booking = await Booking.findOne({
        listing: req.params.id,
        user: req.user._id,
        status: "confirmed",
    });

    if (!booking) {
        req.flash("error", "Only verified guests who have booked this stay can leave a review.");
        return res.redirect(`/listings/${listing._id}`);
    }

    // Check if the user has already left a review for this listing
    const existingReview = await Review.findOne({
        _id: { $in: listing.reviews },
        author: req.user._id,
    });

    if (existingReview) {
        req.flash("error", "You have already submitted a review for this property.");
        return res.redirect(`/listings/${listing._id}`);
    }

    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    newReview.isVerifiedGuest = true;
    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();
    req.flash("success", "Thank you! Your verified guest review has been posted.");
    res.redirect(`/listings/${listing._id}`);
};


module.exports.deleteReview = async (req, res) => {
       let {id, reviewId} = req.params;

         await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
       await Review.findByIdAndDelete(reviewId);
         req.flash("success", "Deleted review successfully");
       res.redirect(`/listings/${id}`);
    };
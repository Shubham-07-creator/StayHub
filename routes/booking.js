const express = require('express');
const router = express.Router();
const wrapAsync = require("../utlis/wrapAsync.js");
const { isLoggedIn, isOwner, isBookingOwner, validateBooking } = require("../middleware.js");
const bookingController = require("../controllers/bookings.js");

// Step 1: Create a Razorpay order for a booking (no booking saved yet)
router.post(
    "/listings/:id/create-order",
    isLoggedIn,
    validateBooking,
    wrapAsync(bookingController.createOrder)
);

// Step 2: Verify Razorpay payment signature, then save the booking
router.post(
    "/listings/:id/verify-payment",
    isLoggedIn,
    wrapAsync(bookingController.verifyPaymentAndBook)
);

// Host view — see all reservations made on their listing
router.get(
    "/listings/:id/reservations",
    isLoggedIn,
    isOwner,
    wrapAsync(bookingController.hostReservations)
);

// Logged-in user's own bookings ("My Trips")
router.get(
    "/bookings",
    isLoggedIn,
    wrapAsync(bookingController.myBookings)
);

// Single booking confirmation / detail page
router.get(
    "/bookings/:bookingId",
    isLoggedIn,
    isBookingOwner,
    wrapAsync(bookingController.showBooking)
);

// Cancel a booking
router.delete(
    "/bookings/:bookingId",
    isLoggedIn,
    isBookingOwner,
    wrapAsync(bookingController.cancelBooking)
);

module.exports = router;

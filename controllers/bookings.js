const Listing = require("../models/listing.js");
const Booking = require("../models/booking.js");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const SERVICE_FEE_PERCENT = 0.10; // 10% service fee, Airbnb-style

// Razorpay TEST MODE keys — free, no real money is ever charged.
// Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env (from the Razorpay Test Mode dashboard).
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function calculatePrice(listing, checkInDate, checkOutDate) {
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const subtotal = nights * listing.price;
    const serviceFee = Math.round(subtotal * SERVICE_FEE_PERCENT);
    const totalPrice = subtotal + serviceFee;
    return { nights, subtotal, serviceFee, totalPrice };
}

// STEP 1 — validate the booking request, then create a Razorpay order (no booking saved yet)
module.exports.createOrder = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
    }

    const { checkIn, checkOut, guests } = req.body.booking;

    if (Number(guests) > listing.maxGuests) {
        return res.status(400).json({ error: `This listing allows a maximum of ${listing.maxGuests} guests` });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
        return res.status(400).json({ error: "Check-in date cannot be in the past" });
    }

    const { nights, totalPrice } = calculatePrice(listing, checkInDate, checkOutDate);

    if (nights <= 0) {
        return res.status(400).json({ error: "Check-out date must be after check-in date" });
    }

    const overlappingBooking = await Booking.findOne({
        listing: listing._id,
        status: "confirmed",
        checkIn: { $lt: checkOutDate },
        checkOut: { $gt: checkInDate },
    });

    if (overlappingBooking) {
        return res.status(400).json({ error: "These dates are already booked. Please choose different dates." });
    }

    const order = await razorpayInstance.orders.create({
        amount: totalPrice * 100, // Razorpay expects amount in paise
        currency: "INR",
        receipt: `stayhub_${Date.now()}`,
    });

    res.json({
        orderId: order.id,
        amount: order.amount,
        key: process.env.RAZORPAY_KEY_ID,
        totalPrice,
        nights,
    });
};

// STEP 2 — verify Razorpay's payment signature, then actually save the booking
module.exports.verifyPaymentAndBook = async (req, res) => {
    const { id } = req.params;
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        checkIn,
        checkOut,
        guests,
    } = req.body;

    const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

    if (generatedSignature !== razorpay_signature) {
        req.flash("error", "Payment verification failed. Please try again.");
        return res.redirect(`/listings/${id}#booking`);
    }

    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const { nights, subtotal, serviceFee, totalPrice } = calculatePrice(listing, checkInDate, checkOutDate);

    const booking = new Booking({
        listing: listing._id,
        user: req.user._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        nights,
        guests,
        pricePerNight: listing.price,
        subtotal,
        serviceFee,
        totalPrice,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
    });

    await booking.save();

    req.flash("success", "Payment successful! Your booking is confirmed.");
    res.redirect(`/bookings/${booking._id}`);
};

module.exports.showBooking = async (req, res) => {
    let { bookingId } = req.params;
    const booking = await Booking.findById(bookingId).populate("listing");

    if (!booking) {
        req.flash("error", "Booking not found");
        return res.redirect("/bookings");
    }

    res.render("bookings/show.ejs", { booking });
};

module.exports.myBookings = async (req, res) => {
    const bookings = await Booking.find({ user: req.user._id })
        .populate("listing")
        .sort({ createdAt: -1 });

    res.render("bookings/index.ejs", { bookings });
};

// Host view — see who booked their listing
module.exports.hostReservations = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }

    const bookings = await Booking.find({ listing: id })
        .populate("user")
        .sort({ checkIn: 1 });

    res.render("bookings/reservations.ejs", { listing, bookings });
};

module.exports.cancelBooking = async (req, res) => {
    let { bookingId } = req.params;
    await Booking.findByIdAndUpdate(bookingId, { status: "cancelled" });
    req.flash("success", "Your booking has been cancelled");
    res.redirect("/bookings");
};

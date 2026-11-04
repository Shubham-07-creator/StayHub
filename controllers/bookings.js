const Listing = require("../models/listing.js");
const Booking = require("../models/booking.js");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const SERVICE_FEE_PERCENT = 0.05; // 5% StayHub platform service fee

// Razorpay TEST MODE keys — free, no real money is ever charged.
// Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env (from the Razorpay Test Mode dashboard).
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Realistic Indian Hospitality GST Calculation:
 * - Base Stay: nights * pricePerNight
 * - Platform Service Fee: 5% of base stay
 * - Indian Accommodation GST Slabs (Govt. of India Hospitality Norms):
 *     - Daily tariff <= ₹7,500: 12% GST (6% CGST + 6% SGST)
 *     - Daily tariff > ₹7,500: 18% GST (9% CGST + 9% SGST)
 * - GST is levied on (Base Stay + Platform Fee)
 * - Total Payable = Base Stay + Platform Fee + GST
 */
function calculatePrice(listing, checkInDate, checkOutDate) {
    if (!(checkInDate instanceof Date) || isNaN(checkInDate.getTime()) ||
        !(checkOutDate instanceof Date) || isNaN(checkOutDate.getTime())) {
        throw new Error("Invalid check-in or check-out dates");
    }
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    if (diffTime <= 0) {
        throw new Error("Check-out date must be strictly after check-in date");
    }
    const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const subtotal = nights * listing.price;
    const serviceFee = Math.round(subtotal * SERVICE_FEE_PERCENT);
    
    // Indian Government GST Hotel Tariff Slabs
    const gstRate = listing.price <= 7500 ? 12 : 18;
    const taxableAmount = subtotal + serviceFee;
    const gstAmount = Math.round(taxableAmount * (gstRate / 100));
    
    // Equal Central & State GST split
    const cgst = Math.round(gstAmount / 2);
    const sgst = gstAmount - cgst;
    
    const totalPrice = subtotal + serviceFee + gstAmount;

    return { 
        nights, 
        subtotal, 
        serviceFee, 
        gstRate, 
        gstAmount, 
        cgst, 
        sgst, 
        totalPrice 
    };
}

// STEP 1 — validate the booking request, then create a Razorpay order (no booking saved yet)
module.exports.createOrder = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
    }

    const isPlatformAdmin = Boolean(
        req.user && req.user.email === (process.env.ADMIN_EMAIL || "shubhamkumar979883@gmail.com")
    );
    if (listing.owner.equals(req.user._id) && !isPlatformAdmin && process.env.NODE_ENV === "production") {
        return res.status(400).json({ error: "As the host, you cannot book your own property." });
    }

    const { checkIn, checkOut, guests } = req.body.booking;

    const guestCount = parseInt(guests, 10);
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > listing.maxGuests) {
        return res.status(400).json({ error: `Please enter a valid guest count between 1 and ${listing.maxGuests}` });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
        return res.status(400).json({ error: "Check-in date cannot be in the past" });
    }

    if (checkOutDate <= checkInDate) {
        return res.status(400).json({ error: "Check-out date must be strictly after check-in date" });
    }

    let priceCalc;
    try {
        priceCalc = calculatePrice(listing, checkInDate, checkOutDate);
    } catch (calcErr) {
        return res.status(400).json({ error: calcErr.message });
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

    let order;
    try {
        order = await razorpayInstance.orders.create({
            amount: priceCalc.totalPrice * 100, // Razorpay expects amount in paise
            currency: "INR",
            receipt: `sh_${Date.now().toString().slice(-8)}_${listing._id.toString().slice(-4)}`,
            notes: {
                listingId: listing._id.toString(),
                userId: req.user._id.toString(),
                checkIn: checkInDate.toISOString(),
                checkOut: checkOutDate.toISOString(),
                guests: String(guestCount),
                totalPrice: String(priceCalc.totalPrice),
            }
        });
    } catch (rzpErr) {
        console.error("Razorpay order creation error:", rzpErr);
        return res.status(500).json({
            error: "Payment gateway error: " + (rzpErr.error?.description || rzpErr.message || "Failed to initialize payment gateway.")
        });
    }

    // Bind order state in session for validation during payment verification
    req.session.pendingOrder = {
        orderId: order.id,
        listingId: listing._id.toString(),
        userId: req.user._id.toString(),
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        guests: guestCount,
        totalPrice: priceCalc.totalPrice,
    };

    res.json({
        orderId: order.id,
        amount: order.amount,
        key: process.env.RAZORPAY_KEY_ID,
        totalPrice: priceCalc.totalPrice,
        nights: priceCalc.nights,
        subtotal: priceCalc.subtotal,
        serviceFee: priceCalc.serviceFee,
        gstRate: priceCalc.gstRate,
        gstAmount: priceCalc.gstAmount,
        cgst: priceCalc.cgst,
        sgst: priceCalc.sgst,
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

    // 1. Signature Verification
    const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

    if (generatedSignature !== razorpay_signature) {
        req.flash("error", "Payment verification failed: Invalid cryptographic signature.");
        return res.redirect(`/listings/${id}#booking`);
    }

    // 2. Anti-Replay Check: Ensure this payment hasn't already been used for an existing booking
    const existingPayment = await Booking.findOne({
        $or: [
            { razorpayPaymentId: razorpay_payment_id },
            { razorpayOrderId: razorpay_order_id }
        ]
    });
    if (existingPayment) {
        req.flash("error", "This payment has already been credited to a confirmed booking.");
        return res.redirect(`/bookings/${existingPayment._id}`);
    }

    // 3. Order Verification via Razorpay API (Ensures order amount & notes match)
    let rzpOrder;
    try {
        rzpOrder = await razorpayInstance.orders.fetch(razorpay_order_id);
    } catch (orderFetchErr) {
        console.error("Razorpay order fetch error:", orderFetchErr);
        req.flash("error", "Could not verify order with payment gateway.");
        return res.redirect(`/listings/${id}#booking`);
    }

    if (!rzpOrder) {
        req.flash("error", "Order not found on payment gateway.");
        return res.redirect(`/listings/${id}#booking`);
    }

    // Verify order binding to this listing and user
    if (rzpOrder.notes) {
        if (rzpOrder.notes.listingId && rzpOrder.notes.listingId !== id.toString()) {
            req.flash("error", "Payment integrity error: Order does not match this listing.");
            return res.redirect(`/listings/${id}#booking`);
        }
        if (rzpOrder.notes.userId && rzpOrder.notes.userId !== req.user._id.toString()) {
            req.flash("error", "Payment integrity error: Order does not belong to logged-in user.");
            return res.redirect(`/listings/${id}#booking`);
        }
    }

    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    let priceCalc;
    try {
        priceCalc = calculatePrice(listing, checkInDate, checkOutDate);
    } catch (e) {
        req.flash("error", "Invalid dates provided for booking.");
        return res.redirect(`/listings/${id}#booking`);
    }

    // Verify amount matches
    if (rzpOrder.amount !== Math.round(priceCalc.totalPrice * 100)) {
        req.flash("error", "Payment amount does not match booking tariff.");
        return res.redirect(`/listings/${id}#booking`);
    }

    // Unique Tax Invoice serial number: SH-INV-YYYYMMDD-XXXX
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `SH-INV-${dateStamp}-${randomSuffix}`;

    const booking = new Booking({
        listing: listing._id,
        user: req.user._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        nights: priceCalc.nights,
        guests: Number(guests) || 1,
        pricePerNight: listing.price,
        subtotal: priceCalc.subtotal,
        serviceFee: priceCalc.serviceFee,
        gstRate: priceCalc.gstRate,
        gstAmount: priceCalc.gstAmount,
        cgst: priceCalc.cgst,
        sgst: priceCalc.sgst,
        totalPrice: priceCalc.totalPrice,
        invoiceNumber,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        refundStatus: "none",
    });

    await booking.save();
    delete req.session.pendingOrder;

    req.flash("success", "Payment successful! Your reservation is confirmed.");
    res.redirect(`/bookings/${booking._id}`);
};

module.exports.showBooking = async (req, res) => {
    let { bookingId } = req.params;
    const booking = await Booking.findById(bookingId)
        .populate({
            path: "listing",
            populate: { path: "owner" }
        })
        .populate("user");

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
    const booking = await Booking.findById(bookingId);

    if (!booking) {
        req.flash("error", "Booking not found");
        return res.redirect("/bookings");
    }

    if (booking.status === "cancelled") {
        req.flash("error", "This reservation has already been cancelled.");
        return res.redirect("/bookings");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(booking.checkIn);
    checkInDate.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
        req.flash("error", "Cannot cancel a booking that has already started or concluded.");
        return res.redirect("/bookings");
    }

    // Attempt a Razorpay refund if this booking was actually paid for
    if (booking.razorpayPaymentId) {
        try {
            const refund = await razorpayInstance.payments.refund(booking.razorpayPaymentId, {
                amount: booking.totalPrice * 100, // full refund, in paise
                speed: "optimum",
            });
            booking.status = "cancelled";
            booking.refundStatus = "processed";
            booking.refundId = refund.id;
            await booking.save();
            req.flash("success", "Your booking has been cancelled and a full refund has been initiated.");
        } catch (refundErr) {
            console.error("Refund failed:", refundErr.message);
            booking.refundStatus = "failed";
            booking.refundError = refundErr.message;
            // Record refund failure status so host/admin knows money was not refunded
            await booking.save();
            req.flash("error", `Booking cancellation recorded, but automatic refund failed: ${refundErr.message}. Support has been notified to process manually.`);
        }
    } else {
        booking.status = "cancelled";
        booking.refundStatus = "not_applicable";
        await booking.save();
        req.flash("success", "Your booking has been cancelled");
    }

    res.redirect("/bookings");
};
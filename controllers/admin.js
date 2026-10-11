const Listing = require("../models/listing.js");
const Booking = require("../models/booking.js");
const User = require("../models/user.js");
const Razorpay = require("razorpay");

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports.renderDashboard = async (req, res) => {
    // 1. Metric Counts
    const totalListings = await Listing.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    
    const confirmedBookings = await Booking.find({ status: "confirmed" });
    const cancelledCount = await Booking.countDocuments({ status: "cancelled" });
    
    // Revenue calculations
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const totalServiceFees = confirmedBookings.reduce((sum, b) => sum + (b.serviceFee || 0), 0);
    const totalGstCollected = confirmedBookings.reduce((sum, b) => sum + (b.gstAmount || Math.max(0, (b.totalPrice || 0) - (b.subtotal || 0) - (b.serviceFee || 0))), 0);

    // 2. Fetch Detailed Collections
    const allBookings = await Booking.find()
        .populate("user")
        .populate("listing")
        .sort({ createdAt: -1 });

    const allListings = await Listing.find()
        .sort({ createdAt: -1 });

    const allUsers = await User.find()
        .select("-hash -salt")
        .sort({ _id: -1 });

    // 3. Analytics for Charts (Last 6 Months Trend & Categories)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const last6Months = [];
    const revenueByMonth = {};
    const bookingsByMonth = {};

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
        last6Months.push(key);
        revenueByMonth[key] = 0;
        bookingsByMonth[key] = 0;
    }

    confirmedBookings.forEach((b) => {
        const bDate = new Date(b.createdAt || (b._id && b._id.getTimestamp ? b._id.getTimestamp() : new Date()));
        const key = `${monthNames[bDate.getMonth()]} ${bDate.getFullYear().toString().slice(-2)}`;
        if (revenueByMonth.hasOwnProperty(key)) {
            revenueByMonth[key] += (b.totalPrice || 0);
            bookingsByMonth[key] += 1;
        }
    });

    const monthlyLabels = last6Months;
    const monthlyRevenueData = last6Months.map(m => revenueByMonth[m]);
    const monthlyBookingsData = last6Months.map(m => bookingsByMonth[m]);

    // Category Distribution across all listings
    const categoryCounts = {};
    allListings.forEach(l => {
        const cat = l.category ? (l.category.charAt(0).toUpperCase() + l.category.slice(1)) : "Trending";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const categoryLabels = Object.keys(categoryCounts);
    const categoryData = Object.values(categoryCounts);

    res.render("admin/dashboard.ejs", {
        totalListings,
        totalUsers,
        totalBookings,
        confirmedCount: confirmedBookings.length,
        cancelledCount,
        totalRevenue,
        totalServiceFees,
        totalGstCollected,
        allBookings,
        allListings,
        allUsers,
        monthlyLabels,
        monthlyRevenueData,
        monthlyBookingsData,
        categoryLabels,
        categoryData,
    });
};

module.exports.cancelBooking = async (req, res) => {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
        req.flash("error", "Booking not found");
        return res.redirect("/admin/dashboard");
    }

    if (booking.razorpayPaymentId && booking.status !== "cancelled") {
        try {
            await razorpayInstance.payments.refund(booking.razorpayPaymentId, {
                amount: booking.totalPrice * 100,
                speed: "optimum",
            });
            booking.status = "cancelled";
            await booking.save();
            req.flash("success", "Booking cancelled and refund initiated by Admin.");
        } catch (err) {
            booking.status = "cancelled";
            await booking.save();
            req.flash("error", "Booking cancelled, but automatic refund failed: " + err.message);
        }
    } else {
        booking.status = "cancelled";
        await booking.save();
        req.flash("success", "Booking cancelled by Admin.");
    }

    res.redirect("/admin/dashboard");
};

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    listing: {
        type: Schema.Types.ObjectId,
        ref: 'Listing',
        required: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    checkIn: {
        type: Date,
        required: true,
    },
    checkOut: {
        type: Date,
        required: true,
    },
    nights: {
        type: Number,
        required: true,
    },
    guests: {
        type: Number,
        required: true,
        min: 1,
    },
    pricePerNight: {
        type: Number,
        required: true,
    },
    subtotal: {
        type: Number,
        required: true,
    },
    serviceFee: {
        type: Number,
        required: true,
    },
    gstRate: {
        type: Number,
        default: 12,
    },
    gstAmount: {
        type: Number,
        default: 0,
    },
    cgst: {
        type: Number,
        default: 0,
    },
    sgst: {
        type: Number,
        default: 0,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    invoiceNumber: {
        type: String,
    },
    status: {
        type: String,
        enum: ["confirmed", "cancelled"],
        default: "confirmed",
    },
    refundStatus: {
        type: String,
        enum: ["none", "processed", "failed", "not_applicable"],
        default: "none",
    },
    refundId: {
        type: String,
    },
    refundError: {
        type: String,
    },
    razorpayOrderId: {
        type: String,
    },
    razorpayPaymentId: {
        type: String,
    },
}, { timestamps: true });

// High-performance query indexes & security uniqueness guards
bookingSchema.index({ listing: 1, status: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ invoiceNumber: 1 });
bookingSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });
bookingSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;

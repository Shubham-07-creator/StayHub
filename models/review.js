const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    comment: String,
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    isVerifiedGuest: {
        type: Boolean,
        default: false,
    },
});

reviewSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
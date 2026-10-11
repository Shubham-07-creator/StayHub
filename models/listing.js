const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Review = require('./review.js');
const { required } = require('joi');

const listingSchema = new Schema({
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    image: {
        url: String,
        filename: String,
    },
    price: { 
        type: Number, 
        required: true
    },
    location: { 
        type: String, 
        required: true
    },
    country: { 
        type: String, 
        required: true
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review',
        },
   ],
   owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
   },
   geometry: {
    type: {
        type: String,
        enum: ["Point"],
        required: true,
   },
   coordinates: {
    type: [Number],
    required: true,
   },
},
// Category field
category: {
    type: String,
    enum: ["trending", "rooms", "iconic", "mountains", "castles", "pools", "camping", "farms", "arctic", "domes", "boats"],
    required: true
},
maxGuests: {
    type: Number,
    default: 4,
},
amenities: {
    type: [String],
    default: ["WiFi", "Air conditioning", "Kitchen", "Free parking", "TV"],
},
});

// High-performance query indexes
listingSchema.index({ category: 1 });
listingSchema.index({ price: 1 });
listingSchema.index({ owner: 1 });
listingSchema.index({ location: 1, country: 1 });
listingSchema.index({ "geometry.coordinates": "2dsphere" });    

listingSchema.post('findOneAndDelete', async (listing) => {
    if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews }});
    }
});

const Listing = mongoose.model('Listing', listingSchema);

module.exports = Listing;
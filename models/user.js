const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose').default;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    username: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        default: "",
    },
    dob: {
        type: Date,
        default: null,
    },
    pincode: {
        type: String,
        default: "",
    },
    country: {
        type: String,
        default: "India",
    },
    state: {
        type: String,
        default: "",
    },
    district: {
        type: String,
        default: "",
    },
    googleId: {
        type: String,
        sparse: true,
    },
    authProvider: {
        type: String,
        enum: ["local", "google"],
        default: "local",
    },
    avatar: {
        type: String,
        default: "",
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    wishlist: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Listing',
        }
    ],
});

// Login happens with "email" instead of the default "username" field
userSchema.plugin(passportLocalMongoose, { usernameField: "email" });

module.exports = mongoose.model('User', userSchema);
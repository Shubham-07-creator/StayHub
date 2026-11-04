require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const initData = require('./data.js');
const Listing = require('../models/listing.js');    
const User = require('../models/user.js');

const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/StayHub";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "shubhamkumar979883@gmail.com";

async function main() {
    await mongoose.connect(dbUrl);
    console.log("Connected to MongoDB for Seeding");
}

const initDB = async () => {
    try {
        await main();

        // Find primary admin user to own seeded listings
        let adminUser = await User.findOne({ email: ADMIN_EMAIL });
        if (!adminUser) {
            adminUser = await User.findOne({});
        }
        const ownerId = adminUser ? adminUser._id : null;

        if (!ownerId) {
            console.error("No user found in database. Please register an admin user before seeding listings.");
            process.exit(1);
        }

        await Listing.deleteMany({});
        const preparedListings = initData.data.map((obj) => ({
            ...obj,
            owner: ownerId,
            geometry: obj.geometry || {
                type: "Point",
                coordinates: [77.2090, 28.6139] // Default coordinates
            }
        }));

        await Listing.insertMany(preparedListings);
        console.log(`Database initialized successfully with ${preparedListings.length} listings owned by ${adminUser.username} (${adminUser.email})`);
        process.exit(0);
    } catch (err) {
        console.error("Seeding error:", err);
        process.exit(1);
    }
};

initDB();
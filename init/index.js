const mongoose = require('mongoose');
const initData = require('./data.js');
const Listing = require('../models/listing.js');    

const MONGO_URL = "mongodb://127.0.0.1:27017/StayHub";

main()
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    await Listing.deleteMany({});
    initData.data = initData.data.map((obj) => ({
        ...obj,
        owner: "6970b683253c5af502c1405d",
    }));
    await Listing.insertMany(initData.data);
    console.log("Database initialized with sample data");
};

initDB();
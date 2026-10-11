const express = require('express');
const router = express.Router();
const wrapAsync = require("../utlis/wrapAsync.js");
const { isLoggedIn } = require("../middleware.js");
const wishlistController = require("../controllers/wishlist.js");

router.post("/:listingId/toggle", wrapAsync(wishlistController.toggleWishlist));

router.get("/", isLoggedIn, wrapAsync(wishlistController.renderWishlist));

module.exports = router;

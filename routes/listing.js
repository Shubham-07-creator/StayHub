const express = require('express');
const router = express.Router();
const Listing = require('../models/listing.js');
const wrapAsync = require("../utlis/wrapAsync.js");
const { isAdmin, validateListing } = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const multer = require('multer');
const { storage } = require('../cloudConfig.js');
const upload = multer({ storage });

router
    .route("/")
    .get(wrapAsync(listingController.index))
    .post(
        isAdmin,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.createListing)
    );
 
// New Route - Only Admin can access
router.get("/new", isAdmin, listingController.renderNewForm);

// Search suggestions live API
router.get("/suggestions", wrapAsync(listingController.searchSuggestions));

router
   .route("/:id")
   .get(wrapAsync(listingController.showListing))
    .put(
        isAdmin,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.updateListing)
    )
    .delete(
        isAdmin,
        wrapAsync(listingController.deleteListing)
    );

// Edit Route - Only Admin can access
router.get(
    "/:id/edit", 
    isAdmin,
    wrapAsync(listingController.editListing)
);

module.exports = router;
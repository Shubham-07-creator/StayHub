const Listing = require("../models/listing.js");
const Booking = require("../models/booking.js");
const ExpressError = require("../utlis/ExpressError.js");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

function escapeRegex(text) {
    if (!text) return "";
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports.index = async (req, res) => {
  const { search, category, minPrice, maxPrice, sort } = req.query;
  let query = {};

  if (search && search.trim() !== "") {
    const safeSearch = escapeRegex(search.trim());
    query.$or = [
      { title:    { $regex: safeSearch, $options: "i" } },
      { country:  { $regex: safeSearch, $options: "i" } },
      { location: { $regex: safeSearch, $options: "i" } },
      { category: { $regex: safeSearch, $options: "i" } }
    ];
  }

  if (category) {
    query.category = category;
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Sorting
  let sortOption = {};
  if (sort === "price_asc") sortOption = { price: 1 };
  else if (sort === "price_desc") sortOption = { price: -1 };
  else if (sort === "newest") sortOption = { _id: -1 };

  const limit = 12;
  const page = Math.max(parseInt(req.query.page) || 1, 1);

  const [totalListings, allListings] = await Promise.all([
    Listing.countDocuments(query),
    Listing.find(query)
      .populate({ path: "reviews", select: "rating" })
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
  ]);

  const totalPages = Math.max(Math.ceil(totalListings / limit), 1);

  res.render("listings/index.ejs", {
    allListings,
    search,
    category,
    minPrice,
    maxPrice,
    sort,
    currentPage: page,
    totalPages
  });
};
 module.exports.renderNewForm =  (req, res) => {
    res.render("listings/new.ejs");
};


module.exports.showListing = async (req, res) => {
    let { id } = req.params;

    // Privacy guard: Only populate phone & email if logged-in user is platform admin or the host
    const isAdminViewer = req.user && req.user.email === (process.env.ADMIN_EMAIL || "shubhamkumar979883@gmail.com");

    const [listing, bookings, guestBooking] = await Promise.all([
        Listing.findById(id)
            .populate({
                path: "reviews", 
                populate: {
                    path: "author",
                    select: "username avatar"
                },
            })
            .populate("owner", isAdminViewer ? "username email phone avatar" : "username avatar"),
        Booking.find({
            listing: id,
            status: "confirmed",
        }).select("checkIn checkOut -_id").lean(),
        req.user ? Booking.findOne({
            listing: id,
            user: req.user._id,
            status: "confirmed",
        }).select("_id").lean() : Promise.resolve(null)
    ]);

    if (!listing) {
        req.flash("error", "The listing you requested does not exist");
        return res.redirect("/listings");
    }

    const isUserVerifiedGuest = Boolean(guestBooking);
    res.render("listings/show.ejs", { listing, bookings, isUserVerifiedGuest });
};


module.exports.createListing = async (req, res, next) => {
    if (!req.body.listing) {
        throw new ExpressError(400, "Send valid data for listing");
    }

    if (!req.file) {
        req.flash("error", "Please upload a property photo.");
        return res.redirect("/listings/new");
    }

    let coordinates = [77.2090, 28.6139]; // Default coordinates (New Delhi)
    try {
        let response = await geocodingClient
            .forwardGeocode({
                query: req.body.listing.location || "India",
                limit: 1,
            })
            .send();

        if (response.body.features && response.body.features.length > 0 && response.body.features[0].geometry) {
            coordinates = response.body.features[0].geometry.coordinates;
        }
    } catch (geoErr) {
        console.warn("Geocoding service unavailable, fallback to default coordinates:", geoErr.message);
    }
       
    let url = req.file.path;
    let filename = req.file.filename;

    if (req.body.listing.amenities && !Array.isArray(req.body.listing.amenities)) {
        req.body.listing.amenities = [req.body.listing.amenities];
    }

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = { url, filename };
    newListing.geometry = {
        type: "Point",
        coordinates
    };

    let savedListing = await newListing.save();
    console.log("Created Listing:", savedListing._id);
    req.flash("success", "New Listing created successfully");
    res.redirect("/listings");
};


module.exports.editListing = async (req, res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "listing you requested for does not exist");
        return res.redirect("/listings");
    }

    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_150,w_150");
    res.render("listings/edit.ejs", { listing, originalImageUrl });
};


module.exports.updateListing = async (req, res) => {

    if (!req.body.listing) {
        throw new ExpressError(400, "send valid data for listing");
    }

    let { id } = req.params;

    if (req.body.listing.amenities && !Array.isArray(req.body.listing.amenities)) {
        req.body.listing.amenities = [req.body.listing.amenities];
    }

    let updateData = { ...req.body.listing };

    // Update coordinates if location changed
    if (req.body.listing.location) {
        try {
            let response = await geocodingClient
                .forwardGeocode({
                    query: req.body.listing.location,
                    limit: 1,
                })
                .send();

            if (response.body.features && response.body.features.length > 0 && response.body.features[0].geometry) {
                updateData.geometry = response.body.features[0].geometry;
            }
        } catch (geoErr) {
            console.warn("Geocode update warning:", geoErr.message);
        }
    }

    // listing update
    let listing = await Listing.findByIdAndUpdate(id, updateData, { new: true });

    // image update
    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }

    req.flash("success", "Listing updated successfully");
    res.redirect(`/listings/${id}`);
};

module.exports.deleteListing = async (req, res) => {
    let { id } = req.params;

    // Safety check: Prevent deletion if there are active, upcoming confirmed bookings
    const activeBookings = await Booking.find({
        listing: id,
        status: "confirmed",
        checkOut: { $gte: new Date() }
    });

    if (activeBookings.length > 0) {
        req.flash("error", `Cannot delete listing: There are ${activeBookings.length} active or upcoming confirmed guest reservation(s). Please resolve them before deleting this stay.`);
        return res.redirect(`/listings/${id}`);
    }

    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log("Deleted Listing: ", deletedListing);
    req.flash("success", "Listing Deleted Successfully");
    res.redirect("/listings");
};

module.exports.searchSuggestions = async (req, res) => {
    const { q } = req.query;
    if (!q || q.trim() === "") {
        return res.json({ suggestions: [] });
    }
    const safeQ = escapeRegex(q.trim());
    const suggestions = await Listing.find({
        $or: [
            { title: { $regex: safeQ, $options: "i" } },
            { location: { $regex: safeQ, $options: "i" } },
            { country: { $regex: safeQ, $options: "i" } },
            { category: { $regex: safeQ, $options: "i" } },
        ]
    })
    .select("title location country price category image")
    .limit(5)
    .lean();

    res.json({ suggestions });
};
const Listing = require("../models/listing.js");
const Booking = require("../models/booking.js");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });


module.exports.index = async (req, res) => {
  const { search, category, minPrice, maxPrice, sort } = req.query;
  let query = {};

  if (search && search.trim() !== "") {
    query.$or = [
      { title:    { $regex: search, $options: "i" } },
      { country:  { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } }
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

    const [listing, bookings, guestBooking] = await Promise.all([
        Listing.findById(id)
            .populate({
                path: "reviews", 
                populate: {
                    path: "author",
                    select: "username avatar"
                },
            })
            .populate("owner", "username email phone"),
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
    let response = await geocodingClient
    .forwardGeocode({
        query: req.body.listing.location,
        limit: 1,
    })
    .send();
       
    let url = req.file.path;
    let filename = req.file.filename;
    if(!req.body.listing) {
        throw new ExpressError(400, "send valid data for listing");
    }

    if (req.body.listing.amenities && !Array.isArray(req.body.listing.amenities)) {
        req.body.listing.amenities = [req.body.listing.amenities];
    }

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = { url, filename };

    newListing.geometry = response.body.features[0].geometry;

    let savedListing = await newListing.save();
    console.log(savedListing);
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

    // 🔥 LOCATION → NEW COORDINATES
    let response = await geocodingClient
        .forwardGeocode({
            query: req.body.listing.location,
            limit: 1,
        })
        .send();

    req.body.listing.geometry =
        response.body.features[0].geometry;

    // listing update
    let listing = await Listing.findByIdAndUpdate(
        id,
        { ...req.body.listing },
        { new: true }
    );

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
    const queryStr = q.trim();
    const suggestions = await Listing.find({
        $or: [
            { title: { $regex: queryStr, $options: "i" } },
            { location: { $regex: queryStr, $options: "i" } },
            { country: { $regex: queryStr, $options: "i" } },
            { category: { $regex: queryStr, $options: "i" } },
        ]
    })
    .select("title location country price category image")
    .limit(5)
    .lean();

    res.json({ suggestions });
};
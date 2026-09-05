const Listing = require("../models/listing.js");
const Booking = require("../models/booking.js");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });



module.exports.index = async (req, res) => {
  const { search, category } = req.query;
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

  const limit = 12;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const totalListings = await Listing.countDocuments(query);
  const totalPages = Math.max(Math.ceil(totalListings / limit), 1);

  const allListings = await Listing.find(query)
    .skip((page - 1) * limit)
    .limit(limit);

  res.render("listings/index.ejs", {
    allListings,
    search,
    category,
    currentPage: page,
    totalPages
  });
};

 module.exports.renderNewForm =  (req, res) => {
    res.render("listings/new.ejs");
};


module.exports.showListing = async (req, res) => {
    let {id} = req.params;
    const listing = await Listing.findById(req.params.id)
       .populate({
        path: "reviews", 
        populate: {
            path: "author"
        },
    })
       .populate("owner");
    if (!listing) {
        req.flash("error", "listing you requested for does not exist");
        return res.redirect("/listings");
    }

    // Already-booked date ranges, so the booking form can block clashing dates
    const bookings = await Booking.find({
        listing: id,
        status: "confirmed",
    }).select("checkIn checkOut -_id");

    console.log(listing);
    res.render("listings/show.ejs", { listing, bookings });
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
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log("Deleted Listing: ", deletedListing);
    req.flash("success", "Listing Deleted Successfully");
    res.redirect("/listings");
};
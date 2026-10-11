const Joi = require('joi');

module.exports.listingSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        country: Joi.string().required(),
        price: Joi.number().required().min(0),

        category: Joi.string()
          .valid(
            "trending",
            "rooms",
            "beach",
            "iconic",
            "mountains",
            "castles",
            "pools",
            "camping",
            "farms",
            "arctic",
            "domes",
            "boats",
            "villas",
            "treehouses",
            "tropical",
            "islands",
            "desert",
            "heritage"
            )
            .required(),

        image: Joi.string().allow("", null),
        maxGuests: Joi.number().min(1).allow(null),
        amenities: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).allow(null),
    }).required(),
});

module.exports.bookingSchema = Joi.object({
    booking: Joi.object({
        checkIn: Joi.date().required(),
        checkOut: Joi.date().greater(Joi.ref("checkIn")).required(),
        guests: Joi.number().required().min(1),
    }).required(),
});

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        comment: Joi.string().required(),
    }).required(),
});
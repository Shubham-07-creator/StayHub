const User = require('../models/user.js');
const Listing = require('../models/listing.js');

module.exports.toggleWishlist = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ 
            success: false, 
            requireLogin: true,
            message: "Please log in to save to your wishlist" 
        });
    }

    const { listingId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    const isAlreadyFavorited = user.wishlist && user.wishlist.some(id => id.toString() === listingId);

    if (isAlreadyFavorited) {
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $pull: { wishlist: listingId } },
            { new: true }
        );
        const count = updatedUser && updatedUser.wishlist ? updatedUser.wishlist.length : 0;
        return res.json({ 
            success: true, 
            favorited: false, 
            count,
            message: "Removed from wishlist" 
        });
    } else {
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $addToSet: { wishlist: listingId } },
            { new: true }
        );
        const count = updatedUser && updatedUser.wishlist ? updatedUser.wishlist.length : 0;
        return res.json({ 
            success: true, 
            favorited: true, 
            count,
            message: "Saved to wishlist ❤️" 
        });
    }
};

module.exports.renderWishlist = async (req, res) => {
    const user = await User.findById(req.user._id).populate({
        path: "wishlist",
        populate: { path: "owner" }
    });

    const validWishlist = (user && user.wishlist)
        ? user.wishlist.filter(item => item !== null && item !== undefined && item._id)
        : [];

    res.render("users/wishlist.ejs", {
        wishlist: validWishlist
    });
};

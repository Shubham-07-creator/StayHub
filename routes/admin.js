const express = require('express');
const router = express.Router();
const wrapAsync = require("../utlis/wrapAsync.js");
const { isAdmin } = require("../middleware.js");
const adminController = require("../controllers/admin.js");

// All admin routes are strictly guarded by isAdmin
router.use(isAdmin);

router.get("/dashboard", wrapAsync(adminController.renderDashboard));

router.delete("/bookings/:bookingId/cancel", wrapAsync(adminController.cancelBooking));

module.exports = router;

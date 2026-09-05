# StayHub 🏡

StayHub is a full-stack Airbnb-style vacation rental platform where users can browse, list, and book stays. Built with Node.js, Express, MongoDB, and EJS.

## Features

- **Listings** — create, browse, edit, and delete property listings with image upload (Cloudinary) and map integration (Mapbox)
- **Search & Filters** — search by title/location and filter by category (trending, rooms, mountains, pools, etc.)
- **Bookings** — date-based booking with automatic overlap/double-booking prevention and price breakdown (subtotal + service fee)
- **Payments** — integrated with **Razorpay** (test mode) for secure checkout; bookings are only confirmed after signature-verified payment
- **Authentication** — email-based login (via Passport.js), signup, logout
- **Email Verification** — new accounts must verify their email with a 6-digit OTP sent via Gmail before they can log in
- **Forgot Password** — OTP-based password reset flow
- **Reviews & Ratings** — users can leave star ratings and comments on listings
- **Rate Limiting** — login attempts are throttled to protect against brute-force attacks
- **Responsive UI** — fully responsive design across mobile, tablet, and desktop

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express 5 |
| Database | MongoDB (Mongoose ODM) |
| Views | EJS + EJS-Mate (layouts) |
| Auth | Passport.js (Local Strategy) + passport-local-mongoose |
| File Storage | Cloudinary (via Multer) |
| Maps | Mapbox |
| Payments | Razorpay |
| Email | Nodemailer (Gmail SMTP) |
| Validation | Joi |
| Testing | Jest |

## Getting Started

### Prerequisites
- Node.js (v22.x recommended)
- A MongoDB Atlas account (or local MongoDB instance)
- A Cloudinary account (for image uploads)
- A Mapbox account (for map integration)
- A Gmail account with an **App Password** (for sending verification/reset emails)
- A Razorpay account in **Test Mode** (for payments)

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the project root with the following variables:
   ```
   ATLASDB_URL=your_mongodb_connection_string
   SECRET=any_random_session_secret
   MAP_TOKEN=your_mapbox_token
   CLOUD_NAME=your_cloudinary_cloud_name
   CLOUD_API_KEY=your_cloudinary_api_key
   CLOUD_API_SECRET=your_cloudinary_api_secret
   EMAIL_USER=your_gmail_address@gmail.com
   EMAIL_PASS=your_16_character_gmail_app_password
   RAZORPAY_KEY_ID=your_razorpay_test_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret
   ```

   > **Note:** `EMAIL_PASS` must be a Gmail **App Password** (Google Account → Security → 2-Step Verification → App Passwords), entered **without spaces**.

3. (Optional) Seed the database with sample listings:
   ```bash
   node init/index.js
   ```

4. Start the server:
   ```bash
   node app.js
   ```
   or, for auto-restart on file changes:
   ```bash
   nodemon app.js
   ```

5. Open your browser at [http://localhost:8080/listings](http://localhost:8080/listings)

## Running Tests

```bash
npm test
```

Unit tests cover booking price calculations, date-overlap detection, and booking validation logic.

## Testing Payments

Razorpay is configured in **Test Mode**, so no real money is ever charged. Use the official test card:
- **Card Number:** `4111 1111 1111 1111`
- **Expiry:** any future date
- **CVV:** any 3 digits

## Project Structure

```
├── app.js                 # Entry point
├── models/                # Mongoose schemas (Listing, Booking, Review, User)
├── controllers/           # Route logic
├── routes/                # Express routers
├── views/                 # EJS templates
├── public/                # Static assets (CSS, JS, images)
├── utlis/                 # Helper utilities (email, error handling, price calc)
├── init/                  # Database seed script
└── tests/                 # Jest unit tests
```

## License

ISC
# StayHub 🏡✨

[![Node.js Version](https://img.shields.io/badge/Node.js-v22+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v5.0-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas_v7+-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payment_Gateway-0C2340?style=for-the-badge&logo=razorpay&logoColor=white)](https://razorpay.com/)
[![Mapbox](https://img.shields.io/badge/Mapbox-GL_JS_v3-000000?style=for-the-badge&logo=mapbox&logoColor=white)](https://www.mapbox.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

> **StayHub** is an ultra-modern, production-grade vacation rental & homestay platform inspired by Airbnb. Built with enterprise-grade architecture, featuring dual payment gateways, real-time Indian GST hospitality tariff calculations, Google OAuth 2.0, Mapbox 3D geocoding, interactive wishlists, an executive user profile portal, and automated Render 24/7 keep-alive uptime services.

---

## 🌟 Key Features & Architecture

### 🏨 Property Listings & Geocoding
- **Complete CRUD Operations**: Create, browse, edit, and manage luxury stays with high-resolution image uploads via Cloudinary.
- **Forward Geocoding**: Automatically geocodes plain-text addresses into exact longitude & latitude via Mapbox API.
- **Interactive Mapbox GL JS**: Custom StayHub-branded red house pin, pulse animations, pitch/compass navigation controls, and exact location guarantee popups.
- **Dynamic Category Filtering**: Browse stays by categories — *Trending, Beachfront, Iconic Cities, Mountains, Castles, Camping, Arctic, Pools, Houseboats, Farms*.

### 💳 Real-World Bookings & Indian GST Billing
- **Razorpay Checkout Integration**: Test mode gateway integration with instant signature verification (`SHA256 HMAC`).
- **Govt. of India Hospitality Tariff Norms**:
  - Daily tariff $\le$ ₹7,500 $\rightarrow$ **12% GST** (6% CGST + 6% SGST)
  - Daily tariff $>$ ₹7,500 $\rightarrow$ **18% Luxury GST** (9% CGST + 9% SGST)
- **Live Tariff Breakdown**: Instant calculation of base nights, 5% platform service fee, CGST, SGST, and total payable amount.
- **Automated Tax Invoicing**: Generates serialized tax invoice numbers (`SH-INV-YYYYMMDD-XXXX`) upon confirmed reservation.
- **Date Clash Prevention**: Smart calendar overlap algorithms prevent double-booking.

### 🔐 Authentication & Security
- **Dual Authentication**:
  - **Local Passport Strategy**: Email/password authentication with hashed password salting (`passport-local-mongoose`).
  - **Google OAuth 2.0**: One-click Google sign-in with automatic profile picture & email synchronization.
- **Brute Force Protection**: Rate-limiting middleware throttling excessive login attempts (`express-rate-limit`).
- **Email OTP Verification**: Two-factor email verification & password resets powered by Brevo API & Nodemailer.
- **Role-Based Access Control**: Platform Admin privileges (`ADMIN_EMAIL`), verified Host capabilities, and guest restrictions.

### 👤 Executive User Profile & Wishlists
- **Airbnb-Style 2-Column Profile**: Redesigned executive UI with account analytics, security settings, and reservation history.
- **Freeze-Free Inline Profile Editing**: Modern zero-modal inline profile editor for uninterrupted UX.
- **Interactive Wishlist**: AJAX-based toggle with animated heart icons and live badge counter synchronization in the navigation bar.

### ⚡ Performance & Render 24/7 Uptime
- **Instant Cold Starts**: Optimized connection pooling (`maxPoolSize: 10`, `minPoolSize: 2`), `compression` Gzip middleware, and static asset caching (`maxAge: 7d`).
- **Render Keep-Alive Worker**: Built-in heartbeat daemon prevents Render Free Tier's 15-minute sleep mode by self-pinging `/ping` every 13 minutes.

---

## 🛠️ Tech Stack

| Domain | Technologies & Libraries |
|---|---|
| **Backend Engine** | Node.js (v22+), Express.js 5 |
| **Database** | MongoDB Atlas, Mongoose ODM |
| **Template Engine** | EJS, EJS-Mate (Reusable Layouts & Partials) |
| **Authentication** | Passport.js, Passport-Local, Passport-Google-OAuth 2.0 |
| **Session Management** | Express-Session, Connect-Mongo (MongoDB Session Store) |
| **Payments** | Razorpay Node.js SDK |
| **Maps & Geolocation**| Mapbox GL JS v3, `@mapbox/mapbox-sdk` |
| **Media & Storage** | Cloudinary API, Multer, `multer-storage-cloudinary` |
| **Emails & Transports**| Brevo REST API, Nodemailer (SMTP) |
| **Compression & Speed**| Compression (Gzip/Brotli), DNS Prefetch, Asset Preconnects |
| **Styling & Icons** | Custom CSS3 Variables, Bootstrap 5.3, FontAwesome 7 Pro |

---

## 📁 Directory Structure

```plaintext
StayHub/
├── app.js                      # Main Express application & keep-alive daemon
├── package.json                # Project dependencies & startup scripts
├── middleware.js               # Auth, validation, & permission middlewares
├── schema.js                   # Joi validation schemas (Listings, Reviews, Bookings)
├── controllers/
│   ├── admin.js                # Admin platform management logic
│   ├── bookings.js             # Razorpay order generation & GST invoice logic
│   ├── listings.js             # Listing CRUD operations & Geocoding
│   ├── reviews.js              # Review creation & deletion
│   ├── users.js                # Auth, registration, profile & OTP workflows
│   └── wishlist.js             # Wishlist toggle & user favorites
├── models/
│   ├── booking.js              # Booking schema with GST and invoice serials
│   ├── listing.js              # Property listing schema with GeoJSON Point
│   ├── review.js               # Star ratings and verified stay stamps
│   └── user.js                 # User schema (local + Google OAuth profile)
├── routes/
│   ├── admin.js                # Admin dashboard routes
│   ├── booking.js              # Booking & payment verification routes
│   ├── listing.js              # Property listing endpoints
│   ├── review.js               # Review endpoints
│   ├── user.js                 # Authentication & profile routes
│   └── wishlist.js             # Wishlist AJAX routes
├── views/
│   ├── admin/                  # Admin dashboard templates
│   ├── bookings/               # Tax invoice & reservation views
│   ├── includes/               # Reusable partials (Navbar, Footer, Flash toasts)
│   ├── layouts/                # Boilerplate wrapper layout
│   ├── listings/               # Listing index, show, edit, and new forms
│   └── users/                  # Profile, login, signup, OTP, and wishlist views
├── public/
│   ├── css/                    # Custom stylesheets & animations
│   └── js/                     # Client-side map & UI interactivity scripts
└── utlis/
    ├── ExpressError.js         # Custom error handling class
    ├── wrapAsync.js            # Async controller wrapper
    └── sendEmail.js            # Dual email transport engine
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20.x or v22.x recommended)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) database connection string
- [Cloudinary](https://cloudinary.com/) account for image uploads
- [Mapbox](https://www.mapbox.com/) account for geocoding & maps
- [Razorpay](https://razorpay.com/) test mode API keys

### 2. Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Shubham-07-creator/StayHub.git
   cd StayHub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   # Database & Session
   ATLASDB_URL=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?appName=StayHub
   SECRET=your_super_secret_session_key
   PORT=8080

   # Cloudinary Media
   CLOUD_NAME=your_cloudinary_name
   CLOUD_API_KEY=your_cloudinary_api_key
   CLOUD_API_SECRET=your_cloudinary_api_secret

   # Mapbox Geocoding
   MAP_TOKEN=your_mapbox_public_token

   # Razorpay Gateway (Test Mode)
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_razorpay_secret

   # Google OAuth 2.0
   GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Email Service (Brevo / Nodemailer)
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_gmail_app_password
   BREVO_API_KEY=your_brevo_api_key

   # Super Admin Email
   ADMIN_EMAIL=shubhamkumar979883@gmail.com
   ```

4. **Seed Sample Listings (Optional):**
   ```bash
   node init/index.js
   ```

5. **Start the Application:**
   ```bash
   npm start
   ```
   Open your browser at [http://localhost:8080](http://localhost:8080).

---

## 🧪 Testing Payments (Razorpay Sandbox)

StayHub is pre-configured with **Razorpay Test Mode**. No real currency is ever debited.
- **Test Card Number:** `4111 1111 1111 1111`
- **Expiry:** Any future date (e.g. `12/32`)
- **CVV:** Any 3 digits (e.g. `123`)
- **OTP:** Any 4-6 digit numeric OTP on the mock screen

---

## 🌐 24/7 Render Deployment Tip

To prevent Render Free Tier's 15-minute sleep mode:
1. Register on **[cron-job.org](https://cron-job.org)** or **[uptimerobot.com](https://uptimerobot.com)** (Free).
2. Create an HTTP monitor pointing to:
   ```text
   https://YOUR-APP.onrender.com/ping
   ```
3. Set the polling interval to **Every 10 minutes**.
4. Enjoy instant sub-second page loads 24/7/365!

---

## 👨‍💻 Author & Maintainer

**Shubham Kumar**  
- **GitHub:** [@Shubham-07-creator](https://github.com/Shubham-07-creator)
- **Role:** Creator & Lead Full-Stack Architect

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
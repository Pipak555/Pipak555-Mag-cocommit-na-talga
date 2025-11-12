# 🔍 COMPREHENSIVE SYSTEM ANALYSIS
## Deep Technical Explanation of All Features

---

## 🏠 HOST PAGE FEATURES

### 1. Registration of Account (via Email)

**How it works:**

1. **User Sign-Up Process:**
   - User fills out registration form with email, password, full name, and selects role (host/guest/admin)
   - System creates Firebase Authentication account using `createUserWithEmailAndPassword`
   - User document is created in Firestore `users` collection with initial profile data

2. **Email Verification (OTP System):**
   - 6-digit OTP code is generated and stored in Firestore `otps` collection
   - OTP is sent via EmailJS to user's email address
   - User receives email with OTP code and verification link
   - User enters OTP on verification page (`/verify-otp`)
   - System verifies OTP against stored code in database
   - If valid, user's `emailVerified` field is set to `true` in Firestore

3. **Account Initialization:**
   - User profile is created with default values:
     - `walletBalance: 0`
     - `points: 0` (for guests)
     - `hostPoints: 0` (for hosts)
     - `role: 'host'` or `'guest'`
     - `emailVerified: false` (until OTP verified)
   - User is redirected to role-specific dashboard after verification

**Code Location:** `src/contexts/AuthContext.tsx` (lines 417-592), `src/lib/emailjs.ts`, `src/pages/auth/OTPVerification.tsx`

**Security:** OTP codes expire after 10 minutes, can only be used once, and are stored securely in Firestore with user ID validation.

---

### 2. Categorization of Hosting (Home, Experience, Service)

**How it works:**

1. **Category Selection:**
   - During listing creation, host selects category from dropdown: `home`, `experience`, or `service`
   - Category is stored in listing document as `category: string`
   - Category determines which listings appear in filtered searches

2. **Category Filtering:**
   - Guests can filter listings by category on browse page
   - URL parameter `?category=home` pre-filters listings
   - Firestore query filters: `where('category', '==', selectedCategory)`
   - Category is displayed as badge on listing cards

3. **Category-Specific Features:**
   - All categories support same features (images, pricing, availability)
   - Category helps with search relevance and recommendations
   - Admin can view listings grouped by category in analytics

**Code Location:** `src/components/host/CreateListingForm.tsx` (category field), `src/pages/guest/BrowseListings.tsx` (filtering)

---

### 3. Save as Draft

**How it works:**

1. **Auto-Save Mechanism:**
   - Form uses `useEffect` with debounced auto-save (2 second delay)
   - When user types, system waits 2 seconds after last keystroke
   - Form data is automatically saved to Firestore as draft listing
   - Draft status: `status: 'draft'` in listing document

2. **Draft Storage:**
   - Only ONE draft per host is allowed (prevents multiple incomplete listings)
   - System checks for existing draft: `where('hostId', '==', hostId) && where('status', '==', 'draft')`
   - If draft exists, it updates the existing draft document
   - If no draft exists, creates new draft document

3. **Draft Recovery:**
   - When host visits create listing page, system checks for existing draft
   - If draft found, shows dialog: "You have an unsaved draft. Load it?"
   - User can choose to load draft or start fresh
   - Draft data is pre-filled into form fields

4. **Publishing Draft:**
   - When host clicks "Publish" or "Submit for Review":
   - Draft status changes to `'pending'` (awaiting admin approval)
   - Draft document is deleted after successful publish
   - Listing becomes visible to admin for review

**Code Location:** `src/components/host/CreateListingForm.tsx` (lines 105-607), `src/lib/firestore.ts` (lines 22-63)

**Technical Details:**
- Uses `useRef` to track debounce timer
- Prevents multiple simultaneous saves
- Drafts are stored in same `listing` collection with `status: 'draft'`
- Auto-save happens on every form field change (debounced)

---

### 4. Adding of Chosen Host (Including Rate, Discount, Promos, Images, Location, Description)

**How it works:**

1. **Listing Creation Form:**
   - Multi-step form with validation using `react-hook-form` and `zod` schema
   - Required fields: title, description, category, price, location, maxGuests
   - Optional fields: discount, promo, bedrooms, bathrooms, amenities

2. **Image Upload:**
   - Images uploaded to Cloudinary (cloud image hosting)
   - Maximum 10 images per listing, 5MB per image
   - Upload progress bar shows real-time progress
   - Images are compressed and optimized automatically
   - Image URLs stored in `images: string[]` array in listing document

3. **Location Selection:**
   - Interactive map picker using Google Maps API
   - Host clicks on map to set location coordinates
   - Address is reverse-geocoded from coordinates
   - Location stored as: `location: string` (address) and `coordinates: { lat, lng }`

4. **Pricing & Discounts:**
   - Base price: `price: number` (per night in PHP)
   - Discount: `discount: number` (fixed amount discount)
   - Promo: `promo: string` (promotional text/description)
   - Final price calculated: `price - discount` when booking

5. **Form Submission:**
   - Form validates all required fields
   - Images uploaded first (with progress tracking)
   - Listing document created in Firestore with status `'pending'`
   - Host receives notification that listing is pending review
   - Admin can approve/reject listing

**Code Location:** `src/components/host/CreateListingForm.tsx`, `src/lib/cloudinary.ts`, `src/lib/validation.ts`

**Data Structure:**
```typescript
{
  title: string,
  description: string,
  category: 'home' | 'experience' | 'service',
  price: number,
  discount?: number,
  promo?: string,
  location: string,
  coordinates: { lat: number, lng: number },
  images: string[],
  maxGuests: number,
  bedrooms?: number,
  bathrooms?: number,
  amenities: string[],
  hostId: string,
  status: 'draft' | 'pending' | 'approved' | 'rejected'
}
```

---

### 5. Messages, Listings, Calendar

**Messages System:**

**How it works:**
1. **Conversation Creation:**
   - When guest clicks "Message Host" on listing, conversation is created
   - Conversation ID is generated: `hostId-guestId` or `guestId-hostId`
   - Conversation stored in `users/{userId}/conversations/{convId}`

2. **Real-Time Messaging:**
   - Uses Firestore `onSnapshot` for real-time message updates
   - Messages stored in `messages` collection with:
     - `senderId`, `receiverId`, `message`, `read: false`, `createdAt`
   - When message sent, receiver gets instant notification
   - Messages marked as read when receiver opens conversation

3. **Message Notifications:**
   - New message creates notification in receiver's notification list
   - Notification includes sender name and message preview
   - Clicking notification opens conversation with sender

**Code Location:** `src/lib/firestore.ts` (lines 490-651), `src/components/shared/Messages.tsx`

**Listings Management:**

**How it works:**
1. **Viewing Listings:**
   - Host dashboard shows all their listings
   - Filtered by status: `where('hostId', '==', hostId)`
   - Real-time updates using Firestore listeners
   - Shows listing status: draft, pending, approved, rejected

2. **Listing Actions:**
   - Edit: Opens create form with existing data pre-filled
   - Delete: Removes listing from Firestore (with confirmation)
   - View: Opens listing detail page (read-only for host)

**Code Location:** `src/pages/host/HostListings.tsx`

**Calendar System:**

**How it works:**
1. **Availability Management:**
   - Host can set `availableDates: string[]` (specific dates available)
   - Host can set `blockedDates: string[]` (dates not available)
   - Calendar shows:
     - Green: Available dates
     - Red: Blocked dates
     - Yellow: Booked dates (from confirmed bookings)

2. **Booking Integration:**
   - When booking is confirmed, those dates are automatically blocked
   - System checks availability before allowing new bookings
   - Calendar updates in real-time as bookings are made

**Code Location:** `src/components/host/CreateListingForm.tsx` (date range picker), `src/lib/availabilityUtils.ts`

---

### 6. Dashboards (Today, Upcomings)

**How it works:**

1. **Host Dashboard Statistics:**
   - **Total Listings:** Count of all listings with `hostId == currentHostId`
   - **Active Bookings:** Bookings with status `'confirmed'` and check-in date >= today
   - **Pending Bookings:** Bookings with status `'pending'` awaiting host approval
   - **Total Earnings:** Sum of all confirmed booking payments (net after service fee)
   - **Host Points:** Points earned from bookings, reviews, listing approvals

2. **Today's Bookings:**
   - Filters bookings where `checkIn == today`
   - Shows guest information, listing details, check-in/check-out times
   - Quick actions: Message guest, View booking details

3. **Upcoming Bookings:**
   - Filters bookings where `checkIn > today && status == 'confirmed'`
   - Sorted by check-in date (soonest first)
   - Shows countdown to check-in date

4. **Real-Time Updates:**
   - Uses Firestore `onSnapshot` listeners for live data
   - Dashboard updates automatically when:
     - New booking created
     - Booking status changes
     - Payment processed

**Code Location:** `src/pages/host/HostDashboard.tsx`

**Data Flow:**
```
Firestore Bookings Collection
  ↓ (Real-time listener)
Filter by hostId
  ↓
Group by date (today, upcoming, past)
  ↓
Calculate statistics
  ↓
Display on dashboard
```

---

### 7. Receiving Payment Methods (PayPal)

**How it works:**

1. **Payment Processing Flow:**
   - Guest makes booking → Booking created with status `'pending'`
   - Host approves booking → Status changes to `'confirmed'`
   - Payment is automatically processed when booking confirmed

2. **Payment Calculation:**
   - **Total Booking Price:** `totalPrice` (may include discounts/coupons)
   - **Service Fee:** 10% of total price (`totalPrice * 0.1`)
   - **Net to Host:** `totalPrice - serviceFee` (90% of booking)

3. **Wallet Credit:**
   - Host's wallet balance is credited with net amount
   - Transaction record created: `type: 'deposit'`, `amount: netToHost`
   - Host can see payment in transaction history

4. **PayPal Payout (Server-Side):**
   - **Note:** Requires Firebase Blaze plan (not available on free Spark plan)
   - Firebase Function `autoProcessHostPayout` triggers when transaction created
   - Function calls PayPal Payouts API to send money to host's PayPal account
   - Host must link PayPal email in account settings
   - Payout status tracked: `payoutStatus: 'pending' | 'completed' | 'failed'`

5. **Manual Payout:**
   - Host can manually request payout from wallet
   - Calls `processHostPayoutFunction` Firebase Function
   - Transfers wallet balance to PayPal account
   - Wallet balance reset to 0 after successful payout

**Code Location:** `src/lib/paymentService.ts` (lines 35-293), `functions/src/paypalPayouts.ts`, `functions/src/index.ts` (lines 155-189)

**Payment Flow Diagram:**
```
Guest Books → Host Approves → Payment Processed
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    ↓                                   ↓
            Wallet Credit (90%)              Service Fee (10%)
                    ↓                                   ↓
            Host Wallet Balance              Platform Account
                    ↓                                   ↓
        PayPal Payout (Auto/Manual)         Admin PayPal Account
```

---

### 8. Account Settings (Profile, Bookings, Coupon)

**Profile Management:**

**How it works:**
1. **Profile Information:**
   - Host can update: full name, phone number, bio
   - Profile picture upload (stored in Cloudinary)
   - Changes saved to Firestore `users/{userId}` document
   - Real-time sync across all devices

2. **PayPal Account Linking:**
   - Host enters PayPal email address
   - Email is validated (format check)
   - PayPal email stored in user document: `paypalEmail: string`
   - Required for receiving payouts

**Bookings Management:**

**How it works:**
1. **Viewing Bookings:**
   - Shows all bookings for host's listings
   - Filtered by: `where('hostId', '==', hostId)`
   - Grouped by status: pending, confirmed, completed, cancelled

2. **Booking Actions:**
   - **Approve:** Changes status to `'confirmed'`, triggers payment processing
   - **Decline:** Changes status to `'cancelled'`, sends notification to guest
   - **View Details:** Shows guest info, dates, total price, payment status

**Coupon Management:**

**How it works:**
1. **Creating Coupons:**
   - Host can create promotional coupons
   - Coupon fields: code, discount amount, valid until date, minimum spend
   - Coupons stored in `users/{userId}/coupons` array
   - Coupons can be shared with guests or used for specific bookings

2. **Coupon Usage:**
   - Guests enter coupon code during booking
   - System validates: code exists, not expired, not used, meets minimum spend
   - Discount applied to booking total
   - Coupon marked as used after successful payment

**Code Location:** `src/pages/host/HostAccountSettings.tsx`

---

### 9. Points & Rewards

**How it works:**

1. **Earning Host Points:**
   - **Completed Booking:** 1 point per ₱100, minimum 50 points
     - Example: ₱5,000 booking = 50 points
     - Example: ₱15,000 booking = 150 points
   - **5-Star Review:** +25 bonus points
   - **Listing Approval:** +100 points when admin approves listing

2. **Points Storage:**
   - Points stored in user document: `hostPoints: number`
   - Updated in real-time when points are awarded
   - Transaction record created for each point award

3. **Redeeming Points:**
   - Host can redeem points for subscription discounts
   - Reward tiers:
     - 200 points = ₱100 discount
     - 500 points = ₱250 discount
     - 1000 points = ₱500 discount
     - 2000 points = ₱1000 discount
   - Points deducted from balance
   - Discount applied to next subscription purchase

4. **Points Display:**
   - Shown on host dashboard as card
   - Detailed view in Account Settings → Rewards tab
   - Shows current balance and available redemption options

**Code Location:** `src/lib/hostPointsService.ts`, `src/components/rewards/HostPointsDisplay.tsx`, `src/pages/host/HostAccountSettings.tsx` (lines 355-367)

**Points Flow:**
```
Booking Completed → Calculate Points → Award Points → Update hostPoints
                                                          ↓
Review Submitted (5-star) → Award Bonus Points → Update hostPoints
                                                          ↓
Listing Approved → Award Points → Update hostPoints
                                                          ↓
Host Redeems Points → Deduct Points → Apply Discount to Subscription
```

---

## 👤 GUEST PAGE FEATURES

### 1. Registration of Account (via Email)

**How it works:**
- Same process as host registration (see Host Feature #1)
- Role set to `'guest'` instead of `'host'`
- Initializes `points: 0` (guest points, not hostPoints)
- Redirects to guest dashboard after verification

---

### 2. Viewing of Category (Home, Experience, Service)

**How it works:**

1. **Category Navigation:**
   - Browse page shows all categories by default
   - Category filter buttons: "All", "Home", "Experience", "Service"
   - Clicking category filters listings: `where('category', '==', selectedCategory)`

2. **Category Display:**
   - Each listing card shows category badge
   - Category icon displayed (home icon, experience icon, service icon)
   - Category used in search relevance scoring

3. **URL-Based Filtering:**
   - URL parameter: `/guest/browse?category=home`
   - Category filter pre-applied when page loads
   - Shareable links with category filter included

**Code Location:** `src/pages/guest/BrowseListings.tsx` (lines 30-38, 207-263)

---

### 3. Add to Favorites

**How it works:**

1. **Adding to Favorites:**
   - Guest clicks heart icon on listing card or detail page
   - System checks if listing already in favorites
   - If not in favorites: Adds listing ID to `favorites: string[]` array in user document
   - If in favorites: Removes listing ID from array (toggle functionality)

2. **Favorites Storage:**
   - Stored in Firestore: `users/{userId}.favorites: string[]`
   - Array contains listing IDs: `['listingId1', 'listingId2', ...]`
   - Real-time sync across devices

3. **Viewing Favorites:**
   - Favorites page loads all listing IDs from user document
   - Fetches full listing details for each ID
   - Displays as grid of listing cards
   - Shows count on dashboard: "Favorites: X"

4. **Real-Time Updates:**
   - Uses Firestore `onSnapshot` listener
   - Favorites count updates instantly when added/removed
   - Heart icon state updates immediately

**Code Location:** `src/lib/firestore.ts` (lines 680-705), `src/pages/guest/Favorites.tsx`, `src/pages/guest/ListingDetails.tsx`

**Technical Implementation:**
```typescript
// Toggle favorite
const toggleFavorite = async (userId, listingId, currentFavorites) => {
  const isFavorite = currentFavorites.includes(listingId);
  const newFavorites = isFavorite
    ? currentFavorites.filter(id => id !== listingId)  // Remove
    : [...currentFavorites, listingId];                 // Add
  await updateDoc(doc(db, 'users', userId), { favorites: newFavorites });
  return newFavorites;
};
```

---

### 4. Viewing of Photos, Amenities, Reviews, Location, Calendar Availability

**Photos:**

**How it works:**
1. **Image Gallery:**
   - Listing detail page shows main image carousel
   - Thumbnail strip below main image
   - Click to zoom: Opens lightbox modal with full-size image
   - Keyboard navigation: Arrow keys to navigate, ESC to close

2. **Image Loading:**
   - Images loaded from Cloudinary URLs stored in `listing.images: string[]`
   - Lazy loading for performance
   - Image optimization: WebP format, responsive sizes

**Amenities:**

**How it works:**
1. **Display:**
   - Amenities shown as badge chips below description
   - Stored as: `amenities: string[]` (e.g., ['WiFi', 'Pool', 'Parking'])
   - Icons displayed for common amenities

**Reviews:**

**How it works:**
1. **Review Display:**
   - Reviews fetched from `reviews` collection: `where('listingId', '==', listingId)`
   - Shows: rating (stars), comment, reviewer name, date
   - Average rating calculated: `sum(ratings) / count(reviews)`
   - Sorted by: newest first, highest rating, lowest rating, most helpful

2. **Review Aggregation:**
   - Average rating stored in listing: `averageRating: number`
   - Review count stored: `reviewCount: number`
   - Updated when new review is submitted

**Location:**

**How it works:**
1. **Map Display:**
   - Google Maps embedded showing listing location
   - Marker placed at listing coordinates
   - Address displayed below map
   - "Get Directions" button opens Google Maps with directions

**Calendar Availability:**

**How it works:**
1. **Availability Calendar:**
   - Calendar shows available/blocked/booked dates
   - **Green dates:** Available for booking
   - **Red dates:** Blocked by host
   - **Gray dates:** Already booked (from confirmed bookings)
   - **Yellow dates:** Selected check-in/check-out range

2. **Date Selection:**
   - Guest selects check-in and check-out dates
   - System validates: dates not blocked, not booked, check-out > check-in
   - Price calculated: `(nights) * pricePerNight`

**Code Location:** `src/pages/guest/ListingDetails.tsx`, `src/components/reviews/ReviewList.tsx`

---

### 5. Share Button (Copy Link, Facebook, Twitter, Instagram, etc.)

**How it works:**

1. **Copy Link:**
   - Clicking "Copy Link" copies listing URL to clipboard
   - URL format: `https://domain.com/guest/listing/{listingId}`
   - Toast notification confirms link copied
   - Uses browser Clipboard API: `navigator.clipboard.writeText(url)`

2. **Social Media Sharing:**
   - **Facebook:** Opens Facebook share dialog with listing URL and title
   - **Twitter:** Opens Twitter compose with pre-filled text and URL
   - **Instagram:** Shows message (Instagram doesn't support web sharing, requires mobile app)
   - Uses Web Share API when available (mobile devices)

3. **Share Data:**
   - Share includes: listing title, description, main image, URL
   - Open Graph meta tags for rich previews on social media

**Code Location:** `src/components/shared/SocialShare.tsx`

**Technical Implementation:**
```typescript
// Copy link
const copyLink = () => {
  navigator.clipboard.writeText(listingUrl);
  toast.success('Link copied!');
};

// Facebook share
const shareFacebook = () => {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(listingUrl)}`);
};

// Twitter share
const shareTwitter = () => {
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(listingTitle)}&url=${encodeURIComponent(listingUrl)}`);
};
```

---

### 6. Filter Search (Where, Dates, Who)

**How it works:**

1. **Location Filter (Where):**
   - Guest enters location in search field
   - Client-side filtering: `listing.location.toLowerCase().includes(searchQuery)`
   - Matches partial location names (e.g., "Manila" matches "Manila, Philippines")
   - Real-time filtering as user types

2. **Date Filter:**
   - Guest selects check-in and check-out dates
   - System loads all confirmed bookings for date range
   - For each listing, checks availability using `isListingAvailableForDates()`
   - Filters out listings that are:
     - Blocked on any date in range
     - Already booked on any date in range
     - Not in availableDates (if specified)

3. **Guest Count Filter (Who):**
   - Guest selects number of guests
   - Filters listings: `listing.maxGuests >= selectedGuests`
   - Only shows listings that can accommodate selected guest count

4. **Additional Filters:**
   - **Price Range:** Min and max price sliders
   - **Category:** Home, Experience, Service
   - **Rating:** Minimum star rating

5. **Filter Combination:**
   - All filters work together (AND logic)
   - Listing must pass ALL filters to be shown
   - Filters applied client-side for instant results
   - URL parameters preserve filters: `?location=Manila&guests=2&checkIn=2025-11-15`

**Code Location:** `src/pages/guest/BrowseListings.tsx` (lines 207-263), `src/lib/availabilityUtils.ts`, `src/components/filters/AdvancedFilter.tsx`

**Filter Flow:**
```
All Listings
    ↓
Apply Location Filter → Filtered Listings
    ↓
Apply Date Availability Filter → Filtered Listings
    ↓
Apply Guest Count Filter → Filtered Listings
    ↓
Apply Price Range Filter → Final Results
```

---

### 7. E-Wallets (PayPal)

**How it works:**

1. **Wallet Balance:**
   - Guest wallet balance stored: `users/{userId}.walletBalance: number`
   - Shows current balance on dashboard and wallet page
   - Real-time updates using Firestore listeners

2. **Depositing Money:**
   - Guest enters deposit amount
   - Clicks "Deposit via PayPal"
   - PayPal payment button appears (PayPal SDK)
   - Guest completes PayPal payment
   - Payment creates transaction: `type: 'deposit'`, `status: 'completed'`
   - Wallet balance updated: `walletBalance += depositAmount`
   - Transaction appears in transaction history

3. **PayPal Account Linking:**
   - Guest can link PayPal account for payments
   - PayPal OAuth flow verifies account
   - PayPal email stored: `paypalEmail: string`
   - Verification status: `paypalEmailVerified: boolean`

4. **Using Wallet for Payments:**
   - When booking, guest can pay with wallet balance
   - System checks: `walletBalance >= bookingTotal`
   - If sufficient: Deducts from wallet, processes booking
   - If insufficient: Shows PayPal payment option

5. **Transaction History:**
   - All transactions stored in `transactions` collection
   - Filtered by: `where('userId', '==', guestId)`
   - Shows: deposits, payments, rewards (points)
   - Real-time updates when new transactions occur

**Code Location:** `src/pages/guest/Wallet.tsx`, `src/components/payments/PayPalButton.tsx`, `src/components/payments/PayPalIdentity.tsx`

**Payment Flow:**
```
Guest Initiates Payment
    ↓
Check Wallet Balance
    ↓
┌─────────────────┴─────────────────┐
↓                                   ↓
Sufficient Balance          Insufficient Balance
    ↓                                   ↓
Deduct from Wallet          Show PayPal Button
    ↓                                   ↓
Process Booking             Guest Pays via PayPal
    ↓                                   ↓
Booking Confirmed           Create PayPal Transaction
                                      ↓
                              Process Booking
```

---

### 8. Account Settings (Profile, Bookings, Wishlist)

**Profile Management:**

**How it works:**
1. **Profile Information:**
   - Guest can update: full name, phone number, bio
   - Profile picture upload
   - Changes saved to Firestore `users/{userId}` document

2. **Password Change:**
   - Guest can change password
   - Requires current password verification
   - Uses Firebase `updatePassword()` method

**Bookings Management:**

**How it works:**
1. **Viewing Bookings:**
   - Shows all bookings for guest: `where('guestId', '==', guestId)`
   - Filtered by: All, Upcoming, Past
   - Real-time updates using Firestore listeners

2. **Booking Details:**
   - Shows: listing info, dates, guests, total price, status
   - Actions: View listing, Message host, Cancel booking, Leave review

3. **Booking Cancellation:**
   - Guest can cancel pending/confirmed bookings (before check-in)
   - Refund processed: Full amount credited back to wallet
   - Booking status changes to `'cancelled'`
   - Host and guest notified

**Wishlist Management:**

**How it works:**
1. **Adding to Wishlist:**
   - Similar to favorites, but separate list
   - Stored in: `users/{userId}.wishlist: string[]`
   - Toggle functionality (add/remove)

2. **Viewing Wishlist:**
   - Wishlist page shows all wishlist listings
   - Can move items from wishlist to favorites
   - Can remove from wishlist

**Code Location:** `src/pages/guest/GuestAccountSettings.tsx`, `src/pages/guest/MyBookings.tsx`, `src/pages/guest/Wishlist.tsx`

---

### 9. Suggestions & Recommendations Based on Previous Bookings

**How it works:**

1. **Recommendation Algorithm:**
   - System analyzes guest's booking history
   - Extracts patterns: categories, locations, price ranges
   - Scores all available listings based on similarity

2. **Scoring System:**
   - **Category Match:** +3 points (if same category as previous bookings)
   - **Location Similarity:** +2 points (if similar location)
   - **Price Range Match:** +1 point (if within 70%-150% of average booking price)
   - **Image Quality:** +0.5 points (if has 4+ images)

3. **Recommendation Display:**
   - Top 6 highest-scored listings shown on dashboard
   - Updates when guest makes new bookings
   - Falls back to popular listings if no booking history

4. **Similar Listings:**
   - On listing detail page, shows "Similar Listings"
   - Based on: same category, similar location, similar price
   - Helps guests discover alternatives

**Code Location:** `src/lib/recommendations.ts`, `src/pages/guest/GuestDashboard.tsx` (lines 79-131)

**Recommendation Flow:**
```
Guest Booking History
    ↓
Extract Patterns (category, location, price)
    ↓
Score All Listings
    ↓
Sort by Score (highest first)
    ↓
Return Top 6 Recommendations
```

**Example:**
- Guest booked 3 "Home" listings in "Manila" averaging ₱2,000/night
- System recommends:
  1. Home listings in Manila (category + location match)
  2. Home listings in nearby areas (category match)
  3. Listings in ₱1,400-₱3,000 price range (price match)

---

## 👨‍💼 ADMIN PAGE FEATURES

### 1. Service Fee from the Hosts

**How it works:**

1. **Service Fee Calculation:**
   - When booking payment is processed, service fee is calculated
   - Service fee rate: **10%** of total booking price
   - Formula: `serviceFee = totalPrice * 0.1`
   - Net to host: `netToHost = totalPrice - serviceFee` (90%)

2. **Service Fee Collection:**
   - Service fee transaction created: `userId: 'platform'`, `type: 'deposit'`, `paymentMethod: 'service_fee'`
   - Transaction stored in `transactions` collection
   - Amount tracked for admin dashboard analytics

3. **Automatic Payout to Admin:**
   - **Note:** Requires Firebase Blaze plan
   - Firebase Function `autoProcessAdminPayout` triggers when service fee transaction created
   - Function calls PayPal Payouts API to send money to admin's PayPal account
   - Admin PayPal email stored in: `adminSettings.paypalEmail` or admin user document
   - Payout status tracked: `payoutStatus: 'pending' | 'completed' | 'failed'`

4. **Service Fee Tracking:**
   - Admin dashboard shows total service fees collected
   - Filtered by date range
   - Breakdown by month/week/day
   - Export to CSV for accounting

**Code Location:** `src/lib/paymentService.ts` (lines 98-188), `functions/src/index.ts` (lines 197-239), `src/pages/admin/AdminDashboard.tsx` (lines 174-216)

**Service Fee Flow:**
```
Booking Payment: ₱10,000
    ↓
Service Fee (10%): ₱1,000 → Platform Account
    ↓
Net to Host (90%): ₱9,000 → Host Wallet
    ↓
Auto Payout → Admin PayPal Account
```

---

### 2. Dashboards Analytics (Best Reviews, Lowest Reviews, List of Bookings, etc.)

**How it works:**

1. **Data Aggregation:**
   - Admin dashboard loads all data: users, listings, bookings, reviews
   - Real-time updates using Firestore listeners
   - Statistics calculated client-side for instant updates

2. **Best Reviews (Top Rated Listings):**
   - Calculates average rating for each listing: `sum(ratings) / count(reviews)`
   - Groups reviews by `listingId`
   - Sorts by average rating (highest first)
   - Shows top 10 listings with ratings and review counts

3. **Lowest Reviews (Lowest Rated Listings):**
   - Same calculation as best reviews
   - Sorted by average rating (lowest first)
   - Helps identify listings needing improvement

4. **List of Bookings:**
   - Shows all bookings with filters: status, date range, host, guest
   - Booking details: dates, total price, service fee, net to host
   - Export to CSV functionality
   - Real-time updates when bookings change

5. **Revenue Analytics:**
   - **Total Revenue:** Sum of all confirmed booking totals
   - **Service Fees:** Sum of all service fee transactions
   - **Subscription Revenue:** Sum of all subscription payments
   - **Total Earnings:** Service fees + subscription revenue
   - Charts showing revenue trends over time

6. **User Statistics:**
   - Total users, hosts, guests
   - New users this month/week
   - Active users (users with bookings)

7. **Listing Statistics:**
   - Total listings, approved, pending, rejected
   - Listings by category
   - Average listing price

**Code Location:** `src/pages/admin/Analytics.tsx`, `src/pages/admin/AdminDashboard.tsx`

**Analytics Calculation Example:**
```typescript
// Calculate top rated listings
const listingRatings = new Map();
reviews.forEach(review => {
  const existing = listingRatings.get(review.listingId) || { total: 0, count: 0 };
  listingRatings.set(review.listingId, {
    total: existing.total + review.rating,
    count: existing.count + 1
  });
});

const topListings = Array.from(listingRatings.entries())
  .map(([listingId, data]) => ({
    listingId,
    averageRating: data.total / data.count,
    reviewCount: data.count
  }))
  .sort((a, b) => b.averageRating - a.averageRating)
  .slice(0, 10);
```

---

### 3. Policy & Compliance (Cancellation Rules, Rules & Regulations, Reports)

**Cancellation Rules:**

**How it works:**
1. **Rule Configuration:**
   - Admin can set cancellation policies
   - Policies stored in `adminSettings` document
   - Rules include: refund percentage, cancellation deadline, fees

2. **Cancellation Processing:**
   - When booking cancelled, system checks cancellation policy
   - Calculates refund based on policy rules
   - Refund credited to guest's wallet
   - Transaction record created for audit

**Rules & Regulations:**

**How it works:**
1. **Policy Management:**
   - Admin can create/edit platform policies
   - Policies stored in `policies` collection
   - Types: Terms of Service, Privacy Policy, Host Rules, Guest Rules

2. **Policy Display:**
   - Policies shown to users during registration
   - Users must accept policies to create account
   - Policy acceptance tracked: `policyAccepted: boolean`, `policyAcceptedDate: string`

**Reports:**

**How it works:**
1. **Report Generation:**
   - Admin can generate reports: bookings, users, revenue, listings
   - Filter by date range, status, category
   - Export to CSV format
   - Reports include: detailed data, summaries, statistics

2. **Report Types:**
   - **Booking Report:** All bookings with details
   - **User Report:** All users with roles and activity
   - **Revenue Report:** Financial transactions and earnings
   - **Listing Report:** All listings with status and performance

**Code Location:** `src/pages/admin/Policies.tsx`, `src/pages/admin/Reports.tsx`

---

### 4. Generation of Reports

**How it works:**

1. **Report Data Collection:**
   - System queries Firestore for requested data
   - Filters applied based on report parameters (date range, status, etc.)
   - Data aggregated and formatted

2. **CSV Export:**
   - Report data converted to CSV format
   - Headers: Column names (e.g., "Booking ID", "Guest", "Host", "Total", "Date")
   - Rows: Data values separated by commas
   - File downloaded with name: `report-{type}-{date}.csv`

3. **Report Content:**
   - **Booking Report:**
     - Booking ID, Guest Name, Host Name, Listing Title
     - Check-in, Check-out, Total Price, Service Fee, Net to Host
     - Status, Payment Method, Created Date
   - **User Report:**
     - User ID, Email, Name, Role(s)
     - Registration Date, Wallet Balance, Points
     - Total Bookings, Total Listings (if host)

**Code Location:** `src/pages/admin/Reports.tsx` (lines 67-148)

**CSV Generation Example:**
```typescript
const generateCSV = (data) => {
  const headers = ['Booking ID', 'Guest', 'Host', 'Total', 'Date'];
  const rows = data.map(booking => [
    booking.id,
    booking.guestName,
    booking.hostName,
    booking.totalPrice,
    booking.createdAt
  ]);
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `report-${Date.now()}.csv`;
  link.click();
};
```

---

### 5. Payment Methods (Confirm, Review, Payment)

**How it works:**

1. **Payment Confirmation:**
   - Admin can view all payment transactions
   - Filter by: type (deposit, payment, reward), status, date range
   - Transaction details: amount, user, description, payment method, date

2. **Payment Review:**
   - Admin can review pending payments
   - Mark payments as confirmed or rejected
   - Update transaction status: `status: 'completed' | 'failed' | 'pending'`

3. **Payment Management:**
   - View service fee collections
   - View subscription payments
   - Track payout status (pending, completed, failed)
   - Manually process payouts if automatic processing fails

**Code Location:** `src/pages/admin/ManagePayments.tsx`

---

## 🎨 WEB LAYOUT FEATURES

### 1. Responsive Layout & Structure

**How it works:**

1. **Mobile-First Design:**
   - CSS uses mobile-first breakpoints
   - Breakpoints: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`
   - Components adapt layout based on screen size

2. **Responsive Components:**
   - **Navigation:** Hamburger menu on mobile, full menu on desktop
   - **Grid Layouts:** 1 column mobile, 2-3 columns tablet, 4+ columns desktop
   - **Cards:** Stack vertically on mobile, grid on desktop
   - **Forms:** Full width on mobile, centered with max-width on desktop

3. **Touch Optimization:**
   - Large touch targets (minimum 44x44px)
   - Swipe gestures for image carousels
   - Touch-friendly buttons and inputs

**Code Location:** All components use Tailwind CSS responsive classes (`sm:`, `md:`, `lg:`)

---

### 2. Smooth & Clear Transitions

**How it works:**

1. **CSS Transitions:**
   - Smooth transitions for hover effects, color changes, size changes
   - Transition duration: `transition-all duration-300`
   - Easing functions: `ease-in-out` for natural motion

2. **Page Transitions:**
   - React Router handles page navigation
   - Fade-in animations for page content
   - Loading states during data fetching

3. **Component Animations:**
   - Modal dialogs: Fade in/out with backdrop
   - Dropdowns: Slide down animation
   - Toast notifications: Slide in from top/bottom

**Code Location:** Tailwind CSS transition classes throughout components

---

### 3. Aesthetic Minimalist & Originality

**How it works:**

1. **Design Principles:**
   - Clean, uncluttered interface
   - Generous white space
   - Focus on content (listings, images)
   - Minimal decorative elements

2. **Visual Hierarchy:**
   - Clear typography scale (headings, body, captions)
   - Consistent spacing system
   - Color used for emphasis, not decoration

3. **Brand Identity:**
   - Custom color palette (primary, secondary, accent)
   - Consistent iconography (Lucide React icons)
   - Custom logo and branding

---

### 4. Color Palette Choices

**How it works:**

1. **Theme System:**
   - Light and dark mode support
   - CSS variables for colors: `--primary`, `--secondary`, `--accent`, `--background`, `--foreground`
   - Colors adapt based on theme (light/dark)

2. **Color Usage:**
   - **Primary:** Main actions (buttons, links)
   - **Secondary:** Secondary actions, accents
   - **Accent:** Highlights, special features
   - **Success:** Green for positive actions (deposits, confirmations)
   - **Error:** Red for errors, cancellations
   - **Warning:** Yellow for warnings, pending states

3. **Accessibility:**
   - Sufficient color contrast (WCAG AA compliant)
   - Color not sole indicator (icons + text)
   - Dark mode reduces eye strain

**Code Location:** `src/index.css` (CSS variables), `tailwind.config.js` (theme colors)

---

### 5. User Interface & Experience

**How it works:**

1. **Navigation:**
   - Clear navigation structure
   - Breadcrumbs for deep pages
   - Back buttons for easy navigation
   - Role-based navigation (different menus for host/guest/admin)

2. **Feedback:**
   - Toast notifications for actions (success, error, info)
   - Loading states during async operations
   - Form validation with clear error messages
   - Confirmation dialogs for destructive actions

3. **Performance:**
   - Lazy loading for images
   - Code splitting for routes
   - Memoization for expensive calculations
   - Optimistic UI updates (update UI before server confirms)

4. **Accessibility:**
   - Semantic HTML elements
   - ARIA labels for screen readers
   - Keyboard navigation support
   - Focus indicators

**Code Location:** All components follow UX best practices, `src/components/ui/` (reusable UI components)

---

## 🔄 SYSTEM ARCHITECTURE OVERVIEW

### Data Flow Example: Booking Process

```
1. Guest Views Listing
   ↓
2. Guest Selects Dates & Applies Coupon
   ↓
3. Guest Clicks "Book Now"
   ↓
4. Booking Created (status: 'pending')
   ↓
5. Host Receives Notification
   ↓
6. Host Approves Booking
   ↓
7. Payment Processed
   ├─→ Check Wallet Balance
   ├─→ Deduct from Wallet (or PayPal)
   ├─→ Calculate Service Fee (10%)
   ├─→ Credit Host Wallet (90%)
   └─→ Create Transactions
   ↓
8. Points Awarded
   ├─→ Guest: +50 points (booking)
   └─→ Host: +points (based on amount)
   ↓
9. Notifications Sent
   ├─→ Guest: Booking confirmed
   └─→ Host: Payment received
   ↓
10. Auto Payouts (if enabled)
    ├─→ Host Payout → Host PayPal
    └─→ Admin Payout → Admin PayPal
```

### Database Structure

**Collections:**
- `users` - User profiles (hosts, guests, admins)
- `listing` - Property listings
- `bookings` - Booking records
- `reviews` - Review/rating data
- `transactions` - Payment/transaction history
- `messages` - Chat messages
- `notifications` - User notifications
- `events` - Platform events (coupons, announcements)
- `otps` - Email verification codes

**Key Relationships:**
- `listing.hostId` → `users.id`
- `booking.guestId` → `users.id`
- `booking.listingId` → `listing.id`
- `review.listingId` → `listing.id`
- `review.bookingId` → `booking.id`
- `transaction.userId` → `users.id`

---

## 🔐 SECURITY & PERMISSIONS

**Firestore Security Rules:**
- Users can only read/write their own data
- Hosts can update their own listings
- Guests can create bookings for themselves
- Admins have elevated permissions
- Service fee transactions: Platform account only
- Points updates: Allowed for reward transactions

**Authentication:**
- Firebase Authentication for user management
- Email verification required
- Password strength requirements
- Session management

---

This comprehensive analysis covers all major features and their technical implementations. Each feature is designed to work seamlessly with the others, creating a complete booking platform ecosystem.


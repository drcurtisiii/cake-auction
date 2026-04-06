# CLAUDE CODE PROMPT — CAKE AUCTION WEBSITE
# Copy everything below this line into Claude Code Desktop

---

## REFERENCE ARCHITECTURE

I have included `Cake_Auction_System_Map_v3.xml` in this project directory. It is a draw.io XML file containing the complete system architecture diagram. **Parse this XML and treat it as your single source of truth** for: the full data model (6 Neon tables), all API endpoints, the 4-state auction lifecycle (Draft → Published → Live → Closed), real-time WebSocket sync architecture, admin vs. public bid history views (admin sees phone + millisecond timestamps; public sees name + time to the minute), device-tied bidder identity, bid button generation logic, and every feature described below. Every node, label, and arrow in that diagram is intentional. Do not deviate from it unless I explicitly say so.

---

## PROJECT OVERVIEW

Build a **cake auction website** for a school fundraiser. Kids raise money for their school trip by auctioning donated cakes. Two sides:

1. **Admin side** — organizer/teacher sets up and manages auctions
2. **Public side** — mobile-first, zero-friction bidding for parents and community

---

## TECH STACK (Non-Negotiable)

| Layer | Service |
|---|---|
| Source code | GitHub repo |
| Hosting + serverless functions | Netlify (auto-deploy from `main`) |
| Database | Neon (serverless PostgreSQL) |
| Image hosting | ImgBB.com (API upload, returns CDN URL) |
| Real-time sync | Ably or Pusher (WebSocket — free tier is fine for school-scale traffic) |
| Frontend | React or Next.js with Tailwind CSS |

---

## BROWSER CONTROL — YOU HAVE PERMISSION

I am using **Claude Code Desktop**. You have browser control. **Use it proactively** throughout this entire build for the following — do not ask me to do these things manually:

### GitHub
- Create the repository if it doesn't exist
- Initialize it with proper `.gitignore` (node_modules, .env, .netlify)
- Commit and push code as you build
- Verify pushes landed correctly

### Netlify
- Log into my Netlify account (I'll authenticate if prompted)
- Create a new site and connect it to the GitHub repo
- Set build settings (build command, publish directory, functions directory)
- Add all environment variables (Neon connection string, ImgBB API key, Ably/Pusher keys, admin passcode salt if any)
- Verify deploys succeed — if a deploy fails, check the Netlify deploy log in the browser and fix it

### Neon
- Log into my Neon account
- Create a new project/database if needed
- Run all migration SQL to create the 6 tables (auctions, cakes, bidders, bids, rules, admin_sessions — schemas are in the XML)
- Grab the connection string and set it as a Netlify env var
- Verify tables exist and are structured correctly

### ImgBB
- Go to https://imgbb.com/ and help me get/verify my API key
- Test the upload endpoint works by uploading a sample image
- Store the API key as a Netlify env var

### Ably or Pusher (Real-Time)
- Help me sign up or log in to whichever we choose
- Create the app/project
- Get the API keys (publish + subscribe)
- Store them as Netlify env vars
- Set up two channels: `admin` (includes phone + ms timestamps) and `public` (name + amount + minute-level time)

### Testing
- After each major milestone, **open the deployed site in the browser and test it yourself**
- Verify the admin login works with today's date as MMDDYY
- Verify cake creation, photo upload, bid placement
- Verify real-time sync by opening two browser tabs and confirming a bid placed in one appears instantly in the other
- Verify the public bid history shows name + amount + time (no phone, no seconds)
- Verify the admin bid history shows name + phone + amount + time with seconds/ms
- Screenshot or describe any issues you find and fix them before moving on

---

## ADMIN SIDE — FULL REQUIREMENTS

### Authentication
- Single input field: 6-digit passcode
- Passcode = today's date formatted as **MMDDYY** (e.g., April 6, 2026 = `040626`)
- On successful entry, set a secure HTTP-only cookie that trusts this device for **30 days**
- No usernames, no accounts, no registration — just the date code
- Passcode rolls daily; previously authenticated devices remain valid for their 30-day window

### Auction Management
- Admin can create **multiple auctions** (each is independent)
- For each auction, admin sets:
  - Title and description
  - **Public-viewable date/time** (when the pre-auction preview becomes visible)
  - **Bidding-opens date/time** (when bidding goes live)
  - **Bidding-closes date/time** (when bidding ends)
  - Pickup date, time, and location
  - Thank-you message (displayed on results page after close)
- A "Copy to My Calendar" button on the public page generates a downloadable `.ics` file with the auction go-live time, title, and link

### Cake / Item Management
- Admin adds cakes to an auction with:
  - Cake name
  - Flavor / description
  - Photo (uploaded to ImgBB via API → CDN URL stored in Neon)
  - **Who donated** the cake (donor name)
  - **Which kid / cause** the proceeds benefit (beneficiary)
  - Starting price — can be set **per item** or **same for all items** in the auction
  - **Minimum bid increment** and **maximum bid increment** — the system auto-generates preset bid buttons between these values (e.g., min=$5, max=$25 → buttons: +$5, +$10, +$15, +$25)
- Items appear on the public page in real time as admin adds them (if auction is in Published state)

### Live Bid Monitor (Admin View)
- Per-cake expandable bid ledger showing **every bid** with:
  - **Bidder name**
  - **Phone number** (so admin can call winners or chase no-shows)
  - **Bid amount**
  - **Timestamp with SECONDS and MILLISECONDS** (e.g., 2:14:37.482 PM) for dispute resolution
- Phone number should be tap-to-call on mobile
- Updates in real time via WebSocket (admin channel)

### Rules & Settings
- Admin can create/edit/reorder a list of auction rules
- Default rules to seed (admin can modify):
  - "If you do not pick up your cake within [X] minutes after auction closing, the next highest bidder will be contacted."
  - "All sales are final. Payment is due at pickup."
  - "By bidding, you agree to these terms."
- Pickup date/time/location (separate fields, displayed on results page)

### Post-Auction Reports
- Per-kid/beneficiary fundraising totals
- Grand total raised across all items
- Winner list with names and **phone numbers** (for contact)
- Full bid history export with millisecond timestamps (CSV or PDF)

---

## PUBLIC SIDE — FULL REQUIREMENTS

### Pre-Auction Preview (Before Go-Live)
- Visible once admin publishes the auction (hits the public-viewable date/time)
- Users can browse cakes as they're added — **no login required**
- Each cake card shows: photo, name, flavor, donor name, beneficiary kid, starting price
- Shows auction go-live date/time prominently
- **"Add to My Calendar"** button → downloads `.ics` file
- Auction rules are viewable
- Bid buttons are **visible but disabled/grayed out** with text like "Bidding opens [date/time]"

### Bidder Registration (First Bid Only)
- **No registration required to VIEW** the auction or browse cakes
- When a user taps a bid button **for the first time**, a modal pops up:
  - **Name** (required)
  - **Phone number** (required)
  - That's it. No email, no credit card, no account creation.
- After submitting, identity is stored in a **device cookie / localStorage**
- All future bids from this device are automatically attributed to this bidder
- A small "Not you? Tap to change" link lets someone switch identity on a shared device
- **Phone number is NEVER shown publicly** — admin only

### Live Bidding (During Auction Window)
- Each cake card shows:
  - Cake photo (from ImgBB CDN)
  - Current high bid amount and high bidder's name
  - "Donated by: [donor name]"
  - "Proceeds go to: [kid name]'s trip fund"
  - Countdown timer to auction close
- **Preset bid buttons** — no typing. Buttons are auto-generated from the admin's min/max increment settings:
  - Example: if current high bid is $25 and increments are $5/$10/$15/$25, buttons show: "$30 | $35 | $40 | $50"
  - One tap = bid placed
- **Per-cake bid history** — expandable list on each card showing:
  - **Bidder name** (first name / nickname)
  - **Bid amount**
  - **Time** (to the **minute** only — e.g., "2:14 PM")
  - **NO phone numbers** (privacy)
  - **NO seconds** (that's admin-only detail)
  - This is the competitive fuel — "Sarah just outbid you!"

### Real-Time Updates (CRITICAL)
- **Every bid must update instantly on every connected device**
- A bidder must NEVER see stale data and think they're the high bidder when they've been outbid
- Use WebSocket (Ably or Pusher) to push bid events to all clients
- When a bid is placed:
  1. Save to Neon DB with millisecond-precision timestamp
  2. Broadcast via WebSocket to all connected clients
  3. Public channel payload: `{ cake_id, bidder_name, amount, timestamp (minute precision) }`
  4. Admin channel payload: `{ cake_id, bidder_name, phone, amount, timestamp (ms precision) }`
  5. All clients update their UI instantly — current high bid, bid history list, countdown
- Also push via WebSocket:
  - New cake added (during Published state)
  - Auction state changes (Published → Live → Closed)

### Results Page (After Auction Closes)
- Automatically displayed when bidding-closes time is reached
- Shows:
  - **Winner per cake** (name + winning bid amount)
  - **Per-kid fundraising totals** (how much each beneficiary raised)
  - **Grand total raised** (big, prominent number)
  - **Thank-you message** from admin
  - **Pickup instructions**: date, time, location
  - **Rules reminder** (pickup window, no-show policy)

---

## DATABASE SCHEMA (Neon PostgreSQL)

Reference the XML for the full schema. Here's the summary — create these exact tables:

```sql
-- Parse the XML for exact field names, but here's the intent:

auctions (id, title, description, preview_at, live_at, close_at, status, pickup_date, pickup_time, pickup_location, thank_you_msg, created_at, updated_at)

cakes (id, auction_id FK, name, flavor, description, donor_name, beneficiary_kid, imgbb_url, starting_price, min_increment, max_increment, created_at)

bidders (id, name, phone, device_token, created_at)

bids (id, cake_id FK, bidder_id FK, amount, timestamp TIMESTAMPTZ with ms precision, created_at)

rules (id, auction_id FK, rule_text, sort_order, created_at)

admin_sessions (id, device_token, authenticated_at, expires_at)
```

---

## API ENDPOINTS (Netlify Functions)

Reference the XML for the full list. Key endpoints:

- `POST /api/auth` — validate MMDDYY passcode, set 30-day cookie
- `CRUD /api/auctions` — create, list, get, update, delete
- `CRUD /api/cakes` — create, list, get, update, delete (scoped to auction)
- `POST /api/bids` — validate increment rules, save with ms timestamp, broadcast via WebSocket
- `GET /api/bids/:cakeId` — full bid history (admin gets phone+ms; public gets name+minute)
- `POST /api/upload` — proxy image to ImgBB API, return CDN URL
- `POST /api/bidders` — register name + phone, return device token
- `GET /api/results/:auctionId` — winners, per-kid totals, grand total
- `CRUD /api/rules` — admin-editable rules list
- `GET /api/calendar/:auctionId` — generate and return .ics file

---

## BUILD ORDER

Execute in this order. After each phase, **deploy to Netlify and test in the browser** before moving to the next:

### Phase 1: Foundation
1. Create GitHub repo with proper structure
2. Set up Netlify site connected to repo
3. Create Neon database and run migrations (all 6 tables)
4. Get ImgBB API key
5. Set up Ably or Pusher account
6. Store all env vars in Netlify
7. Deploy a "Hello World" to verify the pipeline works end-to-end

### Phase 2: Admin Core
1. Admin passcode login page (MMDDYY validation + 30-day cookie)
2. Auction CRUD (create, edit, list, delete)
3. Cake item CRUD with ImgBB photo upload
4. Rules management (CRUD + reorder)
5. **Test in browser**: log in, create an auction, add cakes with photos, set rules

### Phase 3: Public Core
1. Public auction page — pre-auction preview mode
2. Cake card gallery (mobile-first, responsive)
3. "Add to Calendar" .ics generation
4. Bidder registration modal (name + phone on first bid)
5. Preset bid button generation from min/max increment
6. Bid placement + save to DB
7. **Test in browser**: view pre-auction, verify bid buttons are disabled before go-live

### Phase 4: Real-Time
1. Integrate Ably/Pusher WebSocket
2. Bid broadcast on every new bid
3. Live UI updates on all connected clients
4. Admin channel (phone + ms) vs public channel (name + minute)
5. Auction state change broadcasts
6. **Test in browser**: open TWO tabs, place a bid in one, verify it appears instantly in the other. This is the most critical test.

### Phase 5: Auction Lifecycle
1. Automatic state transitions (Draft → Published → Live → Closed) based on timestamps
2. Pre-auction: items visible, bids disabled
3. Live: bids enabled, countdown timer active
4. Closed: bidding disabled, results page auto-displays
5. **Test in browser**: set an auction to go live 1 minute from now, watch it transition

### Phase 6: Results & Reports
1. Results page: winners, per-kid totals, grand total, thank you, pickup info
2. Admin bid history with phone + ms timestamps
3. Admin reports: exportable winner list, per-kid totals, full bid history CSV
4. No-show workflow: admin can mark winner as no-show, system identifies next-highest bidder with phone number
5. **Test in browser**: close an auction, verify results display correctly on public side and reports are accurate on admin side

### Phase 7: Polish
1. Mobile responsiveness pass (test on phone-width viewport)
2. Error handling (network failures, duplicate bids, race conditions)
3. Loading states and animations
4. Countdown timer accuracy
5. Final end-to-end test of complete auction lifecycle
6. **Test in browser**: full lifecycle from auction creation through results

---

## IMPORTANT NOTES

- **Mobile-first**: The public side will be used almost entirely on phones. Design accordingly — big tap targets, scrollable card layout, no pinch-to-zoom needed.
- **Zero friction**: The entire bidding experience should feel like 2 taps. Browse → tap bid → done (after first-time name/phone entry).
- **Real-time is non-negotiable**: A stale UI where someone thinks they're winning when they've been outbid will cause disputes and ruin the fun. Every bid, every device, instantly.
- **Privacy**: Phone numbers are admin-only. Public never sees them. Seconds/milliseconds are admin-only. Public sees time to the minute.
- **The fun factor**: Half the point is outbidding your neighbor. The public bid history list is what makes this engaging. Make sure it's prominent on each cake card, not hidden behind a click.

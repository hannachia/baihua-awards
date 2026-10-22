# Dan-Zhong Baihua Awards website (MERN starter)

React (Vite) client + Express/MongoDB API.

## Run it locally

You need Node 18+ and MongoDB (local, or a free MongoDB Atlas cluster).

    # 1. API
    cd server
    cp .env.example .env      # then edit the values
    npm install
    npm run dev               # http://localhost:5000

    # 2. Website (new terminal)
    cd client
    npm install
    npm run dev               # http://localhost:5173

## Test checklist

1. Open http://localhost:5173 and check the home page on desktop and phone width.
2. Go to /register. Submit with missing fields: you should see error messages.
3. Submit a singing entry with an MP4. You should get a reference number.
4. Enter age 15: the guardian-consent checkbox appears and is required.
5. Go to /admin/login (link in footer) and log in with ADMIN_EMAIL / ADMIN_PASSWORD from server/.env.
6. In /admin: filter entries, change a status, download the file, export CSV.

## Change event details

Edit `client/src/data/event.js` (dates, contact info, categories, awards).

## Before going live (not done yet)

- Replace local file storage (server/src/upload.js) with Cloudflare R2 / S3 / Cloudinary.
- Replace the single .env admin with real user accounts if several organizers need access.
- Send a confirmation email after registration (Resend or SendGrid).
- Add a privacy policy and consent text (reviewed by the organizers).
- Add English/Chinese/Danish translations.
- Deploy: client on Vercel/Netlify, API on Render/Railway, database on MongoDB Atlas.
  Set CLIENT_URL on the API, and point the client's /api calls to the deployed API URL.

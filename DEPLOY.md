# Put the site online for testing (staging)

Goal: a real web address the client can open on his phone, running the same code as your computer.
Everything below has a free plan. You will need: a GitHub account, and a card or PayPal for Cloudflare
(R2 storage asks for one to activate, even though the free allowance should be enough for testing).

## The pieces (and why these)

| Piece | Service | Why |
|---|---|---|
| Website (React) | **Cloudflare Pages** | Free for commercial use, unlimited bandwidth. (Vercel's free plan forbids commercial use, and this site takes payments, so avoid it.) Netlify's free plan also allows it if you prefer. |
| Server (Express) | **Render** (free web service) | Easy Node hosting. Limits: it **sleeps after 15 idle minutes** (first visit then takes up to a minute), it may restart at any time, and its **disk is erased on every restart**. That is why videos go to cloud storage. |
| Database | **MongoDB Atlas** (free M0) | You already created a cluster. |
| Videos and images | **Cloudflare R2** | S3-compatible, free 10 GB, no download fees. |
| Payments | **Stripe, test mode** | Fake cards only. |

Do the steps in this order. Keep a notepad open: you will copy several addresses and keys between sites.
Secrets (passwords, keys) go ONLY into the Render and Cloudflare dashboards, never into GitHub.

---

## Step 1. Put the code on GitHub

1. Create a **private** repository on github.com, named `baihua-awards`.
2. In VS Code, open a terminal in the project folder (the one that contains `client` and `server`) and run:

```bash
git init
git add .
git commit -m "First version"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/baihua-awards.git
git push -u origin main
```

3. Check that `.env` was NOT uploaded: on GitHub open `server/` and make sure there is no `.env` file
   (only `.env.example`). The `.gitignore` in this update takes care of it. If you ever see `.env` on GitHub,
   change every key in it immediately.

## Step 2. MongoDB Atlas

1. Atlas > **Database Access**: make a user (for example `baihua_user`) with a password of letters and numbers only.
2. Atlas > **Network Access** > Add IP Address > **Allow access from anywhere** (`0.0.0.0/0`).
   Render's free plan has no fixed address, so this is needed. The password is what protects the database.
3. Atlas > Clusters > **Connect** > Drivers: copy the string and add the database name:
   `mongodb+srv://baihua_user:PASSWORD@cluster0.xxxxx.mongodb.net/baihua?retryWrites=true&w=majority`
   (this is your `MONGO_URI`; use a NEW database name such as `baihua_staging`, not your test data).

## Step 3. Cloudflare R2 (video storage)

1. Cloudflare dashboard > **R2 Object Storage** > activate (card or PayPal) > **Create bucket**: `baihua-media`.
   Leave it **private**. The server hands out short-lived links.
2. On the R2 page copy your **Account ID**. Your endpoint is `https://ACCOUNT-ID.r2.cloudflarestorage.com`.
3. R2 > **Manage API tokens** > Create API token > permission **Object Read & Write**, limited to `baihua-media`.
   Copy the **Access Key ID** and **Secret Access Key** (the secret is shown only once).

## Step 4. The server on Render

Easy way: this repository has a `render.yaml` file.

1. render.com > sign up with GitHub > **New > Blueprint** > pick `baihua-awards` > **Apply**.
2. Render asks for the secret values. Fill them in:

| Name | Value |
|---|---|
| `MONGO_URI` | the Atlas string from step 2 |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the organizer login. **Use a strong password** (not the one from testing) |
| `CLIENT_URL` | leave a placeholder for now, for example `https://example.com` (you set it in step 6) |
| `STRIPE_SECRET_KEY` | `sk_test_...` from Stripe (test mode) |
| `STRIPE_WEBHOOK_SECRET` | placeholder for now (step 7) |
| `RESEND_API_KEY` | leave empty for testing (see step 8) |
| `S3_ENDPOINT` | `https://ACCOUNT-ID.r2.cloudflarestorage.com` |
| `S3_BUCKET` | `baihua-media` |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | from step 3 |

3. Wait for the deploy to finish. Open `https://YOUR-SERVICE.onrender.com/api/health`. You should see `{"ok":true}`.
   Write that address down. It is your API address.

No Blueprint? Create a **Web Service** by hand: root directory `server`, build `npm install`, start `npm start`,
and add the same names as environment variables (`NODE_VERSION` = `20`, `STORAGE_DRIVER` = `s3`,
`PAYMENT_PROVIDER` = `stripe`, `ENTRY_FEE_CNY` = `100`, `S3_REGION` = `auto`, `JWT_SECRET` = a long random text).

## Step 5. The website on Cloudflare Pages

1. Cloudflare dashboard > **Workers & Pages** > Create > **Pages** > **Connect to Git** > pick `baihua-awards`.
   (Menu names move around from time to time; look for Pages with Git.)
2. Build settings:
   - Root directory: `client`
   - Build command: `npm run build`
   - Output directory: `dist`
3. Environment variables (Production):
   - `VITE_API_URL` = `https://YOUR-SERVICE.onrender.com/api`   (your API address from step 4, plus `/api`)
   - `NODE_VERSION` = `20`
4. Deploy. You get an address like `https://baihua-awards.pages.dev`. This is the website address.

The file `client/public/_redirects` is already included. It makes addresses like `/gallery` work after a refresh.

## Step 6. Tell the server the website address

Render > your service > **Environment** > set `CLIENT_URL` to the Pages address, with no slash at the end
(for example `https://baihua-awards.pages.dev`). Save. Render restarts the server.
If the address is wrong the website shows network or "CORS" errors.

## Step 7. Stripe (test mode)

1. Stripe > make sure the sandbox / test mode is selected > **Developers > Webhooks > Add endpoint**.
2. Endpoint URL: `https://YOUR-SERVICE.onrender.com/api/payments/webhook`
3. Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
4. Copy the endpoint's **Signing secret** (`whsec_...`) into Render as `STRIPE_WEBHOOK_SECRET`.
   (This is a different secret from the one `stripe listen` gave you on your computer.)

## Step 8. Email

For testing you can leave `RESEND_API_KEY` empty. The sign-in codes and confirmation emails are then printed in
Render > your service > **Logs**, so you can still test sign-in by reading the code there.
To send real emails: create a Resend account and put the key in `RESEND_API_KEY`. Until a domain is verified,
Resend only delivers to your own address, so real entrants cannot get emails yet (the client must verify his domain).

---

## Test the staging site (about 20 minutes)

Open the Pages address, ideally on a phone too.
1. First load may take up to a minute (Render waking up). That is normal on the free plan.
2. Register with a small MP4 (under 10 MB), pay with card `4242 4242 4242 4242`. You should see "Payment received".
3. Log in to `/admin/login`, check the entry is **Paid**, and **Publish** it.
4. Open `/gallery`, open the video: it must play (it now comes from R2).
5. Sign in as a viewer (read the code in the Render logs), choose a name, like, comment, reply, open Share.
6. Try a larger video (50 to 100 MB) to see how uploads behave on real hosting.
7. Send the Pages address to the client.

## If something goes wrong

| Symptom | Likely cause and fix |
|---|---|
| Website loads but shows "could not reach the server" | `VITE_API_URL` is wrong or missing in Pages (rebuild after changing it), or the Render service is still waking up |
| Browser console shows a CORS error | `CLIENT_URL` in Render does not exactly match the Pages address (check `https`, no slash at the end) |
| Render deploy fails "Missing MONGO_URI" or similar | a required value is empty in Render > Environment |
| Server logs show MongoDB connection errors | Atlas Network Access does not allow `0.0.0.0/0`, or the password has symbols (use letters and numbers) |
| Upload fails or video does not play | R2 values wrong, or the API token lacks Object Read & Write. Read the Render logs; add `S3_FORCE_PATH_STYLE` = `true` if the logs mention the bucket address |
| Payment succeeds but entry stays Unpaid | wrong `STRIPE_WEBHOOK_SECRET`, or the webhook endpoint address/events are wrong. Reloading the success page also checks directly with Stripe |
| `/gallery` shows "not found" after refresh | `client/public/_redirects` is missing from the repository |
| Every change needs a redeploy | normal: pushing to GitHub redeploys both Render and Pages automatically |

## What must change for the live site (not for staging)

- Render **paid plan** so the server never sleeps or loses time on restart.
- A real domain name, set up on Cloudflare Pages and on the server, and `CLIENT_URL` updated to it.
- Stripe **live** keys and a new live webhook endpoint (after Stripe's business verification).
- A verified email domain at Resend, so entrants and viewers get real emails.
- Strong, new `ADMIN_PASSWORD`; keep database backups on.
- The China decision: speed from mainland China was not tested, and hosting inside China needs an ICP filing.
  Ask someone in China to open the staging site and try a video and a payment before you choose.
- Privacy policy and terms approved by the organizers and a legal adviser.

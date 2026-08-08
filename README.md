# HP Print & Scan — Sales Funnel (Vercel Deployment Guide)

Yeh ek full-stack Next.js app hai — Government + Non-Government leads track karne ke liye,
funnel dashboard aur Daily/Weekly/Monthly/Quarterly/Yearly review ke saath. Data central
database mein save hota hai, isliye team ke sab log same data dekh sakte hain (jaisa Excel
shared drive par hota hai, waisa hi, live web app ke roop mein).

100% FREE tier par deploy hota hai — koi paisa nahi lagega for normal usage
(free limits: Vercel Hobby plan + Upstash Redis free tier = 10,000 commands/day, kaafi hai).

---

## Cheezein jo chahiye (sab free)

1. GitHub account — https://github.com (agar nahi hai to bana lo, 2 min)
2. Vercel account — https://vercel.com (GitHub se hi sign up kar sakte ho, "Continue with GitHub")

Koi coding / terminal command chalane ki zaroorat nahi hai — sab kuch website par click-through hota hai.

---

## Step 1 — Code ko GitHub par daalo

1. github.com par login karo → top-right "+" → **New repository**
2. Naam do: `hp-sales-funnel` → **Create repository**
3. Us naye (khaali) repo ke page par "uploading an existing file" link dikhega — us par click karo
4. Is poore folder (`hp-sales-funnel-app`) ke andar ke SAARE files aur folders drag-and-drop karke upload kar do
   (yaani `app/`, `lib/`, `package.json`, `middleware.js`, `next.config.js`, `.gitignore`, `README.md` — sab kuch)
5. Neeche "Commit changes" button dabao

---

## Step 2 — Vercel par import karo

1. vercel.com par login karo → **Add New → Project**
2. Apni GitHub repo `hp-sales-funnel` dikhegi → **Import**
3. Framework apne aap "Next.js" detect ho jayega — kuch change mat karo
4. Abhi **Deploy** mat dabao — pehle neeche Step 3 karo (varna storage error aayega)
   — Ya deploy kar bhi do, error normal hai, Step 3 ke baad "Redeploy" kar dena

---

## Step 3 — Free Database (Storage) jodo

Yeh sabse zaroori step hai — isi mein aapka lead data save hoga.

1. Vercel Dashboard mein apne project ke andar jao → top par **Storage** tab
2. **Create Database** → **Marketplace Database Providers** mein se **Upstash — Redis** choose karo (Free tier available)
3. Region select karo (koi bhi India ke paas wala, e.g. Mumbai/Singapore) → **Create**
4. Jab bane, us database ko apne `hp-sales-funnel` project se **Connect** kar do
   (yeh automatically `REDIS_URL` ya `KV_REST_API_URL` / `KV_REST_API_TOKEN` environment variables project mein daal dega — app dono ko support karti hai)

---

## Step 4 — Login password set karo

Data business-sensitive hai (tender info), isliye app ke aage ek simple password laga hai.

1. Project → **Settings → Environment Variables**
2. Add karo:
   - `APP_USER` = `admin` (ya jo bhi username chaho)
   - `APP_PASSWORD` = koi strong password
3. **Save**

---

## Step 5 — Deploy / Redeploy

1. Project → **Deployments** tab → latest deployment ke "..." menu → **Redeploy**
   (Storage aur password variables Step 3/4 mein add kiye the, isliye ek fresh deploy chahiye)
2. 1-2 minute mein build ho jayega → aapko ek live URL milega jaisे:
   `https://hp-sales-funnel-yourname.vercel.app`
3. Us URL ko kholo → browser username/password maangega → wahi daalo jo Step 4 mein set kiya tha
4. App ready hai — team ke sabhi log yehi ek URL use kar sakte hain, data automatically sabke liye sync rahega

---

## Aage kya

- Apna khud ka domain (e.g. `sales.timesitsolutions.com`) jodne ke liye: Project → **Settings → Domains**
- Zyada users / heavy usage ho to Vercel aapko apne aap bata dega agar free limit cross ho raha hai
- Data ka backup: "All Leads" tab mein **Export Data (JSON)** button se kabhi bhi poora data download kar sakte ho

---

## Agar kuch atka to

- "Storage not connected" error dikhe → Step 3 dobara check karo, phir Redeploy karo
- 401 / password na chale → Step 4 ke variables sahi se save hue hain ya nahi check karo, phir Redeploy
- Local computer par test karna ho (optional, developer ke liye): `npm install` phir `npm run dev`

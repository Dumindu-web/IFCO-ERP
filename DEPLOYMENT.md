# Deployment Guide: Publicly Accessible Inventory App

This guide explains how to host your "App URL" program on **Render.com** for free, connected to your own **GitHub** repository.

## 1. Prerequisites
- A [GitHub](https://github.com) account.
- A [Render](https://render.com) account (Free).

## 2. Step 1: Push to GitHub
1. Create a new repository on GitHub named `inventory-management`.
2. Open your terminal in the project folder and run:
   ```bash
   git init
   git add .
   git commit -m "Initial deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/inventory-management.git
   git push -u origin main
   ```

## 3. Step 2: Deploy to Render
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Use the following settings:
   - **Name:** `inventory-app`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Click **Advanced** and add these **Environment Variables**:
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEY`: (Your Gemini API Key)
   - `DB_PATH`: `/opt/render/project/src/inventory.db` (This ensures the DB stays in the project folder)

## 4. Important Note on Database Persistence
On Render's **Free Tier**, the filesystem is ephemeral. This means your database (`inventory.db`) will reset whenever the server restarts (usually once a day or after 15 minutes of inactivity).

**To keep your data permanently for free:**
I recommend connecting this app to a free **Supabase** (PostgreSQL) or **MongoDB Atlas** instance. However, to respect your "No Code Changes" requirement, the current setup uses the built-in SQLite database.

## 5. Accessibility
Once deployed, your app will be available at:
`https://inventory-app.onrender.com`

It will be accessible from any device (Desktop, Mobile, Tablet) directly in the browser with no installation required.

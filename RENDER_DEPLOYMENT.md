# Deploying to Render (render.com)

This application is built with **Vite + React 19 + TypeScript**, optimized to run as a fast, high-performance **Static Site** on Render's global CDN network (100% free tier eligible, with zero spin-down latency).

---

## Method 1: Instant 1-Click Deployment with Render Blueprint (Recommended)

Because this repository includes a pre-configured `render.yaml` file, Render can set up everything automatically:

1. **Export or Push your project to GitHub / GitLab:**
   - In Google AI Studio, click the **Settings** / **Export** menu in the top right, and select **Export to GitHub** (or download as ZIP and push to a GitHub repository).
2. **Open Render:**
   - Go to [dashboard.render.com](https://dashboard.render.com) and log in.
3. **Deploy with Blueprint:**
   - Click the **New +** button at the top right of the Render Dashboard.
   - Select **Blueprint**.
   - Connect your GitHub repository.
   - Render will read the `render.yaml` file and display the service details (`3d-ulpin-mapping`).
   - Click **Apply** (or **Create New Resources**).
4. Render will run `npm run build`, publish the `dist` folder, and give you a live HTTPS URL (e.g. `https://3d-ulpin-mapping.onrender.com`).

---

## Method 2: Manual Static Site Setup

If you prefer to configure the deployment manually in the Render dashboard:

1. In [dashboard.render.com](https://dashboard.render.com), click **New +** > **Static Site**.
2. Connect your Git repository.
3. Fill in the following settings:
   - **Name:** `3d-ulpin-mapping` (or your preferred name)
   - **Branch:** `main` (or whichever branch you pushed to)
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
4. Expand **Advanced**:
   - Add Environment Variable:
     - Key: `NODE_VERSION`
     - Value: `20`
5. **Configure Redirects/Rewrites (Important for Single-Page Apps):**
   - In your newly created Static Site page, navigate to **Redirects/Rewrites** in the left sidebar.
   - Add a rule:
     - **Type:** `Rewrite`
     - **Source:** `/*`
     - **Destination:** `/index.html`
   - Click **Save Changes**.
6. Click **Create Static Site** (or trigger a manual deploy).

---

## Build Verification Checklist

- **Node Version:** 20+ (handled automatically via `.node-version` and `render.yaml`)
- **Build Output:** `dist/` containing `index.html` and assets.
- **Overpass / OSM Endpoints:** Uses client-side HTTPS endpoints that work directly in production browsers.
- **Custom Domains & SSL:** Render provides free automated TLS certificates if you connect a custom domain.

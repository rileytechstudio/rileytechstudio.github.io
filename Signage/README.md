# Canva Digital Signage System

A lightweight, robust digital signage system designed to continuously display a Canva presentation without crashing or freezing over long periods.

## Setup Instructions

### 1. Get Your Canva Embed Link
1. Open your presentation in Canva.
2. Click **Share** in the top right.
3. Select **More**, then click **Embed**.
4. Click **Embed** again if prompted.
5. Under the "Smart embed link" section, copy the URL provided.

### 2. Configure the System
1. Open `config.json`.
2. Paste your URLs into the appropriate fields:
   - Use `canvaEmbedUrlLandscape` for standard horizontal TVs.
   - Use `canvaEmbedUrlPortrait` for vertical TVs.
   *(Note: The system will automatically detect the TV's orientation and load the correct one! If one is missing, it will fall back to the other.)* 

### 3. Running the Signage

#### Option A: Local Hosting
You can run this locally using any simple HTTP server. For example, if you have Python installed, run this in your terminal:
```bash
python3 -m http.server 8145
```
Then open `http://localhost:8145` on your TV's browser.

#### Option B: GitHub Pages (Recommended for ease of use)
1. Push this folder to a GitHub repository.
2. Go to the repository **Settings** -> **Pages**.
3. Under "Build and deployment", set Source to "Deploy from a branch" and select the `main` branch.
4. Save. Your signage is now accessible via your GitHub pages link!

### 4. Updating Content
You NEVER have to touch this code again to update your signage! 
Anytime you want to add, remove, or change slides, simply edit the presentation in Canva. Since this uses a live embed, your changes will automatically appear on your TVs within the next refresh cycle (up to 2 hours by default, or immediately if you manually refresh the TV).

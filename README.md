# AeroNexus OS

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Local Development & Setup Guide

Please ensure you have the following tools installed on your machine:
- Git (for version control)
- Node.js (LTS version recommended, for running the JavaScript environment and npm)

First-Time Setup
If you are joining the project for the first time, open your terminal (Terminal / CMD / Git Bash) and run the following commands to clone the repo and install dependencies:

1. Clone the repository to your local machine
git clone https://github.com/HenryyyW/AeroNexus-OS.git

2. Navigate into the project folder
cd AeroNexus-OS

3. Install all required dependencies (this will generate the node_modules folder)
npm install

Daily Updates & Running the App (Pull & Run)
If you already have the project cloned and want to get the latest updates pushed by the team, navigate to the AeroNexus-OS folder and run:

1. Fetch the latest code from GitHub
git pull

2. Ensure all packages are up-to-date (in case new libraries were added)
npm install

3. Start the local development server
npm run dev

Viewing the Web App
After running npm run dev, the terminal will display a local server URL (usually http://localhost:5173 or similar).

Hold Ctrl and click the link, or copy and paste it into your browser.

You can now view and interact with the latest version of the POC!

## Firebase Configuration

Firebase is optional. For the frontend reader, set `VITE_FIREBASE_DATABASE_URL` in `.env.local` using the URL of the configured Realtime Database. Python upload scripts read `FIREBASE_DATABASE_URL` from the process environment. Keep the service-account JSON file local and never commit it.

Use `.env.example` as a variable-name reference; replace its placeholder values with the database URL for your Firebase project.

## Offline Battery Replay

The LFP replay is built from `data/SNL_18650_LFP_25C_0-100_0.5-2C_a_timeseries.txt` and represents a recorded 18650 single-cell bench test, not an eVTOL battery pack or live telemetry. Rebuild its compact browser asset with `npm run prepare:battery-replay`; run parser checks with `npm run test:battery-replay`.

The repository does not include the test protocol or a verified discharge cutoff voltage for this file. A cycle is eligible for relative-capacity comparison only when it contains both positive and negative current rows and positive measured discharge capacity. Capacity retention is normalized to the first eligible cycle; it is not certified battery SOH or RUL, and eligible records are not asserted to be complete 0-100% cycles.

## Road Network KML Data Setup

The road speed overlay requires external KML files that are not committed to this repository.

1. Download the required KML files from:
https://portal.csdi.gov.hk/geoportal/#metadataInfoPanel

2. Place the downloaded KML files into the public folder, under:
public/Road_Network_KML/

3. Ensure this file exists after download:
public/Road_Network_KML/Transportation_TNM_20260717_gdb_CENTERLINE_converted.kml

Without these files, the strategic road segment overlay will not render.

## Live Road Speed API (Development)

Strategic road speeds are now fetched from a local API path instead of a static XML file:

- API path used by frontend: /api/traffic/segment-speeds
- Source feed proxied by Vite: https://resource.data.one.gov.hk/td/traffic-detectors/irnAvgSpeed-all.xml

This proxy is configured in Vite dev server. Run npm run dev to use it locally.

Troubleshooting (For Windows Users):
If you encounter a red error message in Windows PowerShell when running npm run dev (e.g., running scripts is disabled or npm.ps1 cannot be loaded), this is due to a default Windows security restriction.

Quick Fix: Use CMD (Command Prompt) or Git Bash to run the commands instead of PowerShell.

Permanent Fix: Open PowerShell as Administrator, run Set-ExecutionPolicy RemoteSigned -Scope CurrentUser, and press Y to confirm.
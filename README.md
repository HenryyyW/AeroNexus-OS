# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Ascendo Care POC - Local Development & Setup Guide

Please ensure you have the following tools installed on your machine:
- Git (for version control)
- Node.js (LTS version recommended, for running the JavaScript environment and npm)

First-Time Setup
If you are joining the project for the first time, open your terminal (Terminal / CMD / Git Bash) and run the following commands to clone the repo and install dependencies:

1. Clone the repository to your local machine
git clone https://github.com/HowardAscendo/ascendo-care-demo.git

2. Navigate into the project folder
cd ascendo-care-demo

3. Install all required dependencies (this will generate the node_modules folder)
npm install

Daily Updates & Running the App (Pull & Run)
If you already have the project cloned and want to get the latest updates pushed by the team, navigate to the ascendo-care-demo folder and run:

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

## Road Network KML Data Setup

The road speed overlay requires external KML files that are not committed to this repository.

1. Download the required KML files from:
https://portal.csdi.gov.hk/geoportal/#metadataInfoPanel

2. Place the downloaded KML files into the public folder, under:
public/Road_Network_KML/

3. Ensure this file exists after download:
public/Road_Network_KML/Transportation_TNM_20260717_gdb_CENTERLINE_converted.kml

Without these files, the strategic road segment overlay will not render.

Troubleshooting (For Windows Users):
If you encounter a red error message in Windows PowerShell when running npm run dev (e.g., running scripts is disabled or npm.ps1 cannot be loaded), this is due to a default Windows security restriction.

Quick Fix: Use CMD (Command Prompt) or Git Bash to run the commands instead of PowerShell.

Permanent Fix: Open PowerShell as Administrator, run Set-ExecutionPolicy RemoteSigned -Scope CurrentUser, and press Y to confirm.
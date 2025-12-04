# DexDashPro🚀

A lightweight, serverless crypto dashboard that tracks real-time token prices and charts using the DexScreener API.

<a href="https://dex-dash-pro.vercel.app/" target="_blank">
  <img src="https://img.shields.io/badge/🚀_Live_Demo-Start_Here-3b82f6?style=for-the-badge&logo=github&logoColor=white" alt="Live Demo" height="40" />
</a>

## What is this?

**DexDash** is built to be a fast, no-nonsense way to check crypto charts and liquidity data without navigating through heavy exchange interfaces. It runs entirely in the browser—no backend server or API keys required.

## How to deploy?

* **Step-1:** Log in to <a href="https://vercel.com/" target="https://vercel.com/">vercel.com</a> through your Github.

* **Step-2:** Click on Add new project, import this repository or fork and then import if you want to make any changes.

* **Step-3:** Make sure to select "Vite" in framework preset, click deploy.

## Features ✨

* **Real-time Data:** Fetches live price, liquidity, FDV, and volume directly from DexScreener.

* **Live Charts:** Embeds the native DexScreener trading view chart (fully responsive on mobile).

* **Smart Search:** Includes popular tokens (SOL, PEPE, WIF, etc.) and supports searching by contract address, token address or just their name.

* **Mobile Optimized:** The chart automatically adjusts aspect ratios for phone screens so it doesn't look squashed because I don't like dexscreener gui on mobile.

## Known issues:
* No known issues.

## Side note:
* This was a demo project, to test my skills. I wanted to extract the OHLCV values of any of the sol based memecoins that are only few days or hours old, I wanted their whole price chart, from the very start to the present, but I ran into dexscreener's API limitation, it only provides OHLCV of present, not their past's. If you want to then you can try to integrate birdeye API into this to download their full OHLCV with adjustable timeframe and open a pull request.
* I've written a cli based script to get all the ohlcv data I want but I will not make a gui project on this.
* AI was used to write css and comment on codes because I think it's boring.

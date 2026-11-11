# ARERPS Admin Panel

**Platform: iOS (Safari / Home Screen app), web app, website. NOT for Roblox Studio, PC or Xbox engines.**

## What it is (plain English)
AdminPanel.js: PIN-protected control panel for weather, time, disasters, lightning and fire. The PIN is hashed (SHA-256) and stored on the device only; first open asks you to create one. Real multiplayer needs the server to re-check admin rights.

## Details
Tabs: Weather, Time, Disasters (Arm first, then Start), Fire.

## How to use it
`new AdminPanel(divElement, weather, {igniteBuilding, wildfire, extinguishAll, strike, toast}); admin.open().`

It is plain JavaScript (ES modules) with three.js, so it can be copied into any other ARERPS web place (for example a coastal map). Needs no build step.

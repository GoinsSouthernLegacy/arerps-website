# Fire & Firefighting System

**Platform: iOS (Safari / Home Screen app), web app, website. NOT for Roblox Studio, PC or Xbox engines.**

## What it is (plain English)
FireSystem.js: fires grow, spread to trees/buildings, char buildings, and are put out by water spray.

## Details
Events: ignite, structure, charred, out, allout, wildfire.

## How to use it
`new FireSystem(scene); registerBuilding(b); igniteBuilding(b); spray(origin, dir, dt, power); update(dt, camPos).`

It is plain JavaScript (ES modules) with three.js, so it can be copied into any other ARERPS web place (for example a coastal map). Needs no build step.

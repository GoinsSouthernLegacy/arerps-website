# Weather & Disaster System

**Platform: iOS (Safari / Home Screen app), web app, website. NOT for Roblox Studio, PC or Xbox engines.**

## What it is (plain English)
WeatherSystem.js (the brain: clouds, rain, wind, time of day, lightning odds, disasters) + WeatherFX.js (what you see: sky, clouds, rain, snow, lightning bolts, tornado, tsunami, quake shake, flood).

## Details
Presets: clear, partly, overcast, rain, thunderstorm, supercell, fog, windy, snow, blizzard. Disasters (OFF by default, admin must arm them): tornado, hurricane, tsunami, earthquake, wildfire, flood. Lightning: rarely hits players (1%), sometimes hits buildings (which can start a fire).

## How to use it
`new WeatherSystem(); new WeatherFX(scene, camera, weather, uniforms); each frame: weather.update(dt); fx.update(dt, playerPos).`

It is plain JavaScript (ES modules) with three.js, so it can be copied into any other ARERPS web place (for example a coastal map). Needs no build step.

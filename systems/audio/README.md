# Ambient Audio System

**Platform: iOS (Safari / Home Screen app), web app, website. NOT for Roblox Studio, PC or Xbox engines.**

## What it is (plain English)
AmbientAudio.js: synthesized rain, wind, thunder, quake rumble, hose spray and SCBA mask breathing. No audio files needed. Browsers (iOS especially) only allow sound after a tap, so call audio.start() from a button.

## Details
Flags: audio.mask, audio.fps (breathing is heard only in first person with the mask on).

## How to use it
`new AmbientAudio(); audio.start(); audio.setWeather(eff, gust); audio.thunder(delay).`

It is plain JavaScript (ES modules) with three.js, so it can be copied into any other ARERPS web place (for example a coastal map). Needs no build step.

# Player Controls System

**Platform: iOS (Safari / Home Screen app), web app, website. NOT for Roblox Studio, PC or Xbox engines.**

## What it is (plain English)
PlayerControls.js: WASD, drag-to-look, on-screen joystick, pinch to switch first/third person, collision, a firefighter avatar.

## Details
Pinch out = first person, pinch in = third person (also V key / FPS button).

## How to use it
`new PlayerControls(canvas, camera, ui, {height, ground, colliders}); controls.update(dt).`

It is plain JavaScript (ES modules) with three.js, so it can be copied into any other ARERPS web place (for example a coastal map). Needs no build step.

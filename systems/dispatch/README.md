# Dispatch Data Center MK-II

**Platform: iOS (Safari / Home Screen app), web app, website. NOT for Roblox Studio, PC or Xbox engines.**

## What it is (plain English)
A walk-in building built from your Dispatch Data Center images: Dispatcher Control Room (curved console, monitors, big wall screen), Server Room (racks with LEDs, cable trays), NOC room, Electrical (high voltage) room and UPS room. Colors: green = normal, blue = data, red = alert.

The big wall screen is live: when a fire starts anywhere in the game it lists the incident, and the red lights pulse.

## How to use it
`const d = buildDispatchCenter(scene, W, x, z, groundY); d.setIncidents([{id,label,units,x,z}]); d.update(t, dt);`

The site is at the east side of the campus; use Menu → Go to Dispatch Data Center.

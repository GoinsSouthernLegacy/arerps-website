/* Site content, kept in one place so it is easy to edit. */
window.ARERPS = {
  departments: [
    { icon: "👮", name: "Police", text: "Patrol, traffic, investigations and SWAT with SPRAID tactical droid support." },
    { icon: "🚒", name: "Fire & Rescue", text: "Structure fires, rescue, hazmat and cutting-torch extrication." },
    { icon: "🚑", name: "EMS", text: "Ambulance crews and medical droids with injectors and scanners." },
    { icon: "📡", name: "Dispatch", text: "The voice of the city. Run the NOC and coordinate every unit." },
    { icon: "🔒", name: "Security", text: "Private security and AI security units protecting key sites." },
    { icon: "🧑‍🤝‍🧑", name: "Civilian", text: "Jobs, housing, businesses, pets, fishing, farming and more." }
  ],
  units: [
    { id: "SPRAID_UNIT_09_POLICE", name: "SPRAID Unit 09 – Police", role: "Tactical police droid",
      text: "Full light suite, extendable spotlight, grapple winch, evidence scanner, energy shield and bodycam." },
    { id: "SPRAID_AI_UNIT_09", name: "SPRAID AI Unit 09", role: "AI NPC variant",
      text: "Same body as the police droid, with extra behavior-tree hooks for smarter NPC decisions." },
    { id: "SPRAID_POLICE_DEPLOYER", name: "Police Deployer", role: "Vehicle / bay",
      text: "Carries and deploys units with ramps and a full lightbar." },
    { id: "SPRAID_MEDICAL_AMBULANCE", name: "Medical Ambulance", role: "Medical vehicle",
      text: "Injector cargo and white/red emphasis for medical response." },
    { id: "SPRAID_MEDICAL_AI_UNIT", name: "Medical AI Unit", role: "Medical droid",
      text: "Injector, scanner and a calmer emotion set for patient care." },
    { id: "SPRAID_DEPLOYMENT_DRONE", name: "Deployment Drone", role: "Small flyer",
      text: "A mini drone launched from a unit's drone bay for scouting and delivery." }
  ],
  lightModes: ["Solid", "SlowFlash", "MedFlash", "FullFlash", "Pursuit"],
  locations: [
    "Downtown / Market Street", "Walnut Street Bridge", "Tennessee Aquarium", "Chattanooga Choo Choo",
    "Lookout Mountain", "Signal Mountain", "Coolidge Park / North Shore", "Riverfront Parkway",
    "Hamilton Place Mall", "I-24 near Moccasin Bend"
  ],
  city: [
    { icon: "🌉", name: "Walnut Street Bridge", text: "One of the world's longest pedestrian bridges over the Tennessee River." },
    { icon: "🐠", name: "Tennessee Aquarium", text: "Riverfront landmark and an aquarium-pack feature in the plan." },
    { icon: "🚂", name: "Choo Choo District", text: "Historic railway terminal turned hotel and entertainment district." },
    { icon: "⛰️", name: "Lookout Mountain", text: "Scenic mountain roads, overlooks and rescue scenarios." },
    { icon: "🏙️", name: "Downtown", text: "Police stations, businesses, streets and holographic signage." },
    { icon: "🌳", name: "Coolidge Park", text: "Riverside park, carousel and North Shore dining." }
  ],
  roadmap: [
    ["Phase 1 – Master Blueprint", "The full plan: world, buildings, interiors, animals, robots, player systems and monetization."],
    ["Phase 2 – World Generation", "AI-assisted terrain, heightmaps, trees, roads, railways and bridges."],
    ["Phase 3 – Buildings", "Real Tennessee buildings and landmarks from reference photos, with collision and LODs."],
    ["Phase 4 – Interiors", "Fully furnished, interactive interiors."],
    ["Phase 5 – Wildlife", "Tennessee animals, fish and snakes, rigged and animated."],
    ["Phase 6 – A.I. Robots & Holograms", "Police, EMS, fire, dispatch, security and service robots; holographic phones, signs and HUDs."],
    ["Phase 7 – Player Systems", "Phone, jobs, MDT, dispatch, vehicles, banking, housing, crime, court and jail."],
    ["Phase 8 – Monetization", "Fair, cosmetic-focused gamepasses, packs and boosters."],
    ["Phase 10 – Animal Companions", "Call, bond with, adopt and command stray animals."]
  ]
};

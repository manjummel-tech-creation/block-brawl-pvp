# Block Brawl PvP

A Minecraft-style PvP combat game that runs in your browser. Fight smart bots or your friends online, with real Minecraft-feeling combat: attack cooldowns, crits, knockback, shields, maces, wind charges, cobwebs, totems and more.

**▶ Play it here:** https://manjummel-tech-creation.github.io/block-brawl-pvp/

## Features

- **Minecraft-accurate movement and combat:** 20-tick physics, sprinting and jump-resets, 1.9+ attack cooldown (or 1.8 spam mode), crits and crit streaks, sword sweeps, armour and Protection, shields and axes, i-frames.
- **Weapons and items:** swords, axes, a Thor's-hammer mace (stun or bounce, lightning on smash), bows, wind charges, cobwebs, water buckets, golden apples, splash healing and strength potions, totems of undying, and a dash/lunge.
- **Smart bots:** pick the type and difficulty of each bot (Beginner → Godlike). Bots strafe and dodge, W-tap, block with shields, web-trap you, wind-charge + mace combo, bridge, pillar, tunnel, hide to heal, and make human mistakes.
- **Online multiplayer:** host a room, share the 5-letter code, and play with up to 4 friends (peer-to-peer, no server needed).
- **Modes and maps:** Duel, Free-for-all, Team fight or Juggernaut (you vs an army), with kit modes (Sword, Cobweb, Mace, Axe & Shield, Pot PvP, UHC, Full SMP, Custom). Maps: Big Biome World, Arena, Sky Bridges, Sunflower Plains, Cave, Nether, Snowy Peaks, Desert Canyon.
- **Elytra, firework rockets and ender pearls**, a 27-slot backpack (press E) that remembers your layout between games.
- **Kill-cam and full match replays:** scrub the timeline, change speed, and watch from anyone's eyes or with a free camera.
- **Fully rebindable controls.**

## Controls (defaults)

| Action | Key |
|---|---|
| Move | WASD |
| Jump | Space |
| Sprint | Ctrl, Q, or double-tap W |
| Inventory / backpack | E |
| Open elytra | Hold Space in the air (~1 s) |
| Sneak | Shift |
| Attack | Left click |
| Use / block / place | Right click |
| Raise shield | F |
| Dash / lunge | R |
| Healing potion | Y |
| Strength potion | U |
| Camera | V |
| Scoreboard | Tab |
| Pause | Esc / P |

## Running locally

Open `index.html` in a browser. To edit, change the files in `js/` and run `./build.sh`, which concatenates `head.html` + `js/*.js` into `index.html`.

Built with [three.js](https://threejs.org/) and [PeerJS](https://peerjs.com/).

# best-flight-game-20261126-0057

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/tidy-puffin-8531/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/tidy-puffin-8531/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Sky Courier — Island Run: a complete, original flight game that plays offline in a desktop browser from static files. Fly a small courier plane in chase view over a procedural island — patchwork fields, a river, hills and a runway — thread the glowing gold rings, mind your fuel, and bring her home for a gentle touchdown. Three sorties (Ring Run by day, Dusk Delivery, and a gusty Storm Run), a lit HUD with altitude, speed, heading, throttle and fuel, a compass strip, an attitude ball, and a simple WebAudio engine hum and ring chimes. No libraries, no network, no build step.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 and press ENTER to fly. Arrows/WASD fly, W/S throttle, G gear, P pause, M mute; or hold the left mouse button and steer toward the cursor. Land gently on the strip to refuel.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Node.js 22.18 or later, standard library only. The program copies `game/` and `screenshots/` to the output directory and writes `out/dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=s9gfzj9a&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>

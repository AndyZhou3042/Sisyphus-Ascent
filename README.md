# Sisyphus // The Ascent

A 2D browser platformer set in a cyberpunk Tartarus of neon circuitry, classical temples, and steep ruins. Guide Sisyphus up eight uphill terraces with a powered exoskeleton, a rocket booster, and a sledgehammer.

## Play

Open `index.html` in a browser and select **Begin ascent**. The game runs locally with no installation or build step.

| Action | Keyboard |
| --- | --- |
| Move | A / D or Left / Right |
| Jump | Space |
| Rocket jump | Tap Shift while grounded |
| Swing the sledgehammer | J |
| Restart from the beginning | R |
| Pause or resume | Esc |
| Mute or unmute music and effects | M or the audio button |

Touch controls appear on devices with a touch pointer.

Build up speed before jumping. Every terrace slopes downhill behind you, so releasing the controls makes Sisyphus coast, then slide off the lower edge. Tap Shift on the ground for a single forward and upward rocket launch. Running before launching carries you farther. Use Space for a shorter jump. Music starts when you select **Begin ascent**.

Leap across seven gaps and get past melee guards, projectile turrets, and flying drones. The midpoint checkpoint restores armor and serves as your retry point if you fall or lose all your armor. Reach the summit gate to finish the level.

## Development

- `index.html` contains the game canvas, menus, HUD, and controls.
- `style.css` styles the interface and touch controls.
- `game.js` defines the level, physics, enemies, combat, and canvas rendering.
- `audio.js` synthesizes the music and sound effects using the Web Audio API.

Run `node --check game.js` and `node --check audio.js` for syntax checks if Node.js is installed. Open the game in a browser to verify gameplay changes.

See [CHANGELOG.md](CHANGELOG.md) for the development history.

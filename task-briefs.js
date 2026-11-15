export const taskBriefs = {
  "aim-lab": [
    "Aim Lab",
    "An aim trainer built around short, repeatable shooting drills.",
    "Play one 30-second Gridshot 3×3 round. The score is the number of spheres hit.",
  ],
  balatro: [
    "Balatro",
    "A poker deckbuilder where jokers and card upgrades turn familiar hands into scoring combos.",
    "Beat blinds and advance through as many antes as possible. Round progress and chips both count.",
  ],
  battleblock: [
    "BattleBlock Theater",
    "A puzzle platformer with traps, moving platforms, and collectible gems.",
    "Collect enough green gems to open the exit, then finish the level. Gems, completion, and finishing speed count.",
  ],
  "black-myth": [
    "Black Myth: Wukong",
    "A third-person action RPG inspired by Journey to the West.",
    "Defeat the boss in a fixed encounter. The best confirmed percentage of boss health removed is the score.",
  ],
  brotato: [
    "Brotato",
    "A top-down arena survivor with enemy waves, materials, and between-wave upgrades.",
    "Survive as many waves as possible and collect materials. Both wave progress and pickups add to the score.",
  ],
  forza: [
    "Forza Horizon 5",
    "An open-world driving game set in Mexico.",
    "Follow the active route to the marked destination. The score is measured in metres of progress toward the waypoint.",
  ],
  "kingdom-rush": [
    "Kingdom Rush 5: Alliance",
    "A tower defense game where towers and heroes work together to stop enemy waves.",
    "Defend Heart of the Forest, Stage 3, through all ten waves. Clearing the stage earns the highest score band, and remaining lives improve the result.",
  ],
  kof98: [
    "The King of Fighters ’98",
    "A classic arcade fighting game where timing, spacing, and defense decide each round.",
    "Fight the CPU in a fixed matchup. The score comes from the health bars, with partial credit if the round is unfinished.",
  ],
  "nba-2k25": [
    "NBA 2K25",
    "A basketball simulation; this benchmark uses a one-on-one matchup.",
    "Score against the CPU and defend your basket. Each point you score adds 15; each CPU point subtracts 5.",
  ],
  overcooked: [
    "Overcooked! 2",
    "A kitchen game about coordinating chefs, ingredients, and orders under a timer.",
    "Control both chefs in Story 2-1 to serve fries and fried chicken. Preparation progress and the final score toward three stars both count.",
  ],
  palworld: [
    "Palworld",
    "An open-world adventure about catching and working with creatures called Pals.",
    "Capture a Penking and a Pengullet alive in the dungeon. The score rewards confirmed captures and how quickly they happen.",
  ],
  "riders-republic": [
    "Riders Republic",
    "An outdoor action sports game with bikes, skis, snowboards, and more.",
    "Earn as many trick points as possible in 100 seconds. Only points awarded by the game after the landing count.",
  ],
  sekiro: [
    "Sekiro: Shadows Die Twice",
    "An action adventure built around sword duels, deflections, and precise movement.",
    "Defeat Gyoubu Masataka Oniwa across both lives without resurrecting. Confirmed vitality loss earns partial credit.",
  ],
  "slay-the-spire": [
    "Slay the Spire",
    "A deckbuilding roguelike where combat and route choices shape each climb.",
    "Climb as far as possible in one run. The highest confirmed floor is the score.",
  ],
  trackmania: [
    "Trackmania",
    "A precision time-trial racer built around short tracks and medal times.",
    "Finish the lap as fast as possible. Finished laps are scored against medal times; unfinished attempts score by distance.",
  ],
};

const steamAppIds = {
  "aim-lab": 714010,
  balatro: 2379780,
  battleblock: 238460,
  "black-myth": 2358720,
  brotato: 1942280,
  forza: 1551360,
  "kingdom-rush": 2849080,
  kof98: 222420,
  "nba-2k25": 2878980,
  overcooked: 728880,
  palworld: 1623730,
  "riders-republic": 2290180,
  sekiro: 814380,
  "slay-the-spire": 646570,
  trackmania: 11020,
};

export function steamStoreUrl(gameId) {
  const appId = steamAppIds[gameId];
  return appId ? `https://store.steampowered.com/app/${appId}/` : null;
}

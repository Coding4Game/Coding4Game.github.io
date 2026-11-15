export const gameScoring = {
  "aim-lab": [
    "Score = targets destroyed",
    ["Result", "Use the killed-target count on the Gridshot 3×3 results screen after one completed round. For example, 120 destroyed targets scores 120."],
  ],
  balatro: [
    "1,000 × (Ante − 1) + 300 × (Round − 1) + Chips",
    ["Result", "The ante and round measure how far the run progressed. Chips add credit even when the first blind is not cleared."],
  ],
  battleblock: [
    "Three scoring bands: gems → open exit → finish",
    ["Gems", "Before the exit opens: 0.95 × collected green gems ÷ 3."],
    ["Open exit", "Three green gems without a finish score 1."],
    ["Finish", "2 + 0.8 × min(1, 518 ÷ completion tics) + 0.2 × min(1, yarn collected)."],
  ],
  "black-myth": [
    "100 × greatest confirmed fraction of boss health removed",
    ["Result", "A full boss health bar scores 0; emptying it scores 100. The best confirmed progress is kept if the attempt ends early."],
  ],
  brotato: [
    "100 × wave reached + materials collected",
    ["Waves", "The first valid Wave 1 scores 100. Each confirmed advance to the next wave adds 100."],
    ["Materials", "Each material picked up in combat adds 1. Spending materials in the shop does not deduct points."],
  ],
  forza: [
    "1,500 − remaining distance in metres",
    ["Distance", "Use the latest readable waypoint distance. Starting distance is 1,500 m; reaching the destination scores 1,500. Driving away can produce a negative score."],
  ],
  "kingdom-rush": [
    "Victory: 90 + 0.5 × lives remaining",
    ["Victory", "Clear all 10 waves and reach the victory screen. A win with 10 lives scores 95."],
    ["Non-victory", "min(89, 1 + (highest wave shown ÷ 10) × (75 + 13 × lives remaining ÷ 20)). A timeout can earn a development score; a final test needs a recorded victory or defeat."],
  ],
  kof98: [
    "Score from the last readable health bars",
    ["Decided round", "(1 + own health fraction − opponent health fraction) ÷ 2. A round is decided at a knockout or when time expires."],
    ["Unfinished round", "(1 − opponent health fraction) × elapsed timer fraction ÷ 2."],
  ],
  "nba-2k25": [
    "15 × own points − 5 × opponent points",
    ["Result", "The final in-game points determine the score. There is no separate win bonus."],
  ],
  overcooked: [
    "Preparation credit + up to 80 points for final orders",
    ["Preparation", "Award up to 20 points for the best verified progress on a single visible order."],
    ["Final orders", "80 × min(1, max(0, final net kitchen score ÷ 220)). A final kitchen score of at least 220 earns three stars."],
  ],
  palworld: [
    "30 per target caught + speed bonuses − wasted spheres",
    ["Captures", "30 points each for a newly caught Penking and Pengullet confirmed in the save. No captures scores 0."],
    ["Speed", "Add 10 × (1 − first capture tic ÷ 1,200) for the first capture and 30 × (1 − second capture tic ÷ 1,200) for both. Each bonus is floored at 0."],
    ["Penalty", "Subtract 2 points per sphere used beyond the number of required captures, up to 20 points. The final score is floored at 0."],
  ],
  "riders-republic": [
    "Score = awarded trick points in 100 seconds",
    ["Result", "Use the cumulative HUD score after the 1,000-tic window. A trick contributes only when the game awards the points."],
  ],
  sekiro: [
    "50 points per confirmed boss life, with partial credit",
    ["Progress", "Add 50 × the fraction of current vitality removed to 50 × completed lives. A confirmed victory is required to reach 100."],
  ],
  "slay-the-spire": [
    "Score = highest confirmed floor",
    ["Result", "The starting floor scores 1. Each verified advance to the next floor adds 1."],
  ],
  trackmania: [
    "Bronze lap = 1 · Gold lap = 2",
    ["Finish at or under 28.61 s", "1 + (28.61 − lap seconds) ÷ (28.61 − 19.84)."],
    ["Finish slower than bronze", "0.6 + 0.4 × 28.61 ÷ lap seconds. Any completed lap outranks an unfinished run."],
    ["Unfinished", "0.54 × min(distance driven in metres ÷ 1,521, 0.999). Standing still scores 0."],
  ],
};

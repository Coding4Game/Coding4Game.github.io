// Normalized game scores from Table 3 of the supplied GVC-style Coding4Games paper.
// The normalization includes coding agents, GUI baselines and the human reference.
export const paperGameOrder = [
  "balatro", "forza", "slay-the-spire", "black-myth", "brotato",
  "nba-2k25", "riders-republic", "kof98", "trackmania", "kingdom-rush",
  "overcooked", "sekiro", "aim-lab", "palworld", "battleblock",
];

export const paperScores = {
  astra:              [100.0, 100.0, 100.0, 37.8, 96.0, 45.2, 26.2, 80.9, 51.6, 27.3, 0.0, 1.9, 64.4, 50.4, 7.0],
  "gpt-5.6-sol":     [14.8, 10.0, 0.0, 39.6, 5.3, 58.1, 47.3, 60.1, 0.9, 74.2, 3.0, 13.7, 41.1, 15.0, 7.0],
  "gpt-5.6-terra":   [15.4, 49.1, 0.0, 73.2, 37.1, 0.0, 53.1, 54.6, 1.9, 28.9, 0.0, 7.2, 52.4, 6.5, 7.0],
  opus:               [50.8, 84.0, 42.1, 16.6, 84.3, 77.4, 22.5, 37.0, 39.8, 25.8, 1.5, 10.3, 100.0, 53.9, 14.1],
  "claude-opus-5":   [29.4, 32.4, 57.9, 38.1, 89.1, 58.1, 11.1, 16.4, 0.8, 28.3, 0.0, 2.9, 94.7, 68.0, 37.7],
  "claude-sonnet-5": [9.0, 35.9, 0.0, 12.1, 0.7, 38.7, 0.0, 62.8, 13.5, 15.4, 0.0, 2.7, 45.3, 24.3, 7.0],
  "gemini-3.8-flash": [18.8, 34.2, 42.2, 3.7, 30.3, 22.6, 17.9, 98.4, 18.1, 27.3, 1.5, 10.0, 41.6, 89.0, 7.0],
  "qwen3.8-flash":   [0.0, 20.8, 0.0, 65.4, 95.1, 32.3, 100.0, 19.1, 20.6, 19.6, 0.0, 5.5, 51.3, 41.1, 3.7],
  "qwen3.8-27b":     [16.7, 10.0, 21.0, 0.0, 1.2, 58.1, 14.1, 5.5, 4.6, 28.9, 0.0, 0.0, 22.6, 5.1, 0.0],
  "glm-5.3-flash":   [14.5, 19.0, 0.0, 5.1, 1.3, 71.0, 1.3, 0.0, 34.0, 0.0, 7.4, 1.6, 40.6, 0.0, 0.0],
  "deepseek-v4.1-flash": [0.0, 0.0, 36.8, 10.3, 28.5, 6.4, 16.7, 10.9, 33.9, 30.4, 1.5, 0.7, 32.3, 40.1, 7.0],
  "kimi-k3":          [0.0, 15.0, 0.0, 47.2, 0.0, 54.8, 32.4, 16.4, 1.2, 1.8, 1.5, 9.7, 0.0, 0.8, 0.0],
};

export const paperReferenceScores = [
  { name: "Human reference", mean: 97.2 },
  { name: "GPT-5.6-Sol · GUI", mean: 26.4 },
  { name: "Claude Sonnet 5 · GUI", mean: 26.8 },
];

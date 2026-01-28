
export interface GameTheme {
  id: string;
  name: string;
  questionTemplates: string[];
  cards: string[]; // Array of 2 Image URLs
}

export const GAME_THEMES: GameTheme[] = [
  {
    id: "lucky_draw_set1",
    name: "Golden Fortune",
    questionTemplates: ["Find the Golden Ticket", "Who is the Lucky Winner?", "Select the Royal Card", "Ultimate Fortune Choice"],
    cards: [
      "/images/cards/1.jpg",
      "/images/cards/2.jpg"
    ]
  },
  {
    id: "lucky_draw_set2",
    name: "Diamond Rush",
    questionTemplates: ["Find the Diamond King", "Select the Rare Gem", "Luxury Choice", "Elite Member Pick"],
    cards: [
      "/images/cards/1.jpg",
      "/images/cards/2.jpg"
    ]
  },
  {
    id: "lucky_draw_set3",
    name: "Platinum Series",
    questionTemplates: ["Platinum Winner", "Select the Top Tier", "Exclusive Access Card", "Find the Prestige Pick"],
    cards: [
      "/images/cards/1.jpg",
      "/images/cards/2.jpg"
    ]
  },
  {
    id: "lucky_draw_set4",
    name: "Neon Nights",
    questionTemplates: ["Find the Glowing Card", "Night Rider Choice", "Cyber Luck", "Future Win"],
    cards: [
      "/images/cards/1.jpg",
      "/images/cards/2.jpg"
    ]
  },
  {
    id: "lucky_draw_set5",
    name: "Royal Elite",
    questionTemplates: ["King's Choice", "Select the Royal Seal", "Majestic Win", "Imperial Luck"],
    cards: [
      "/images/cards/1.jpg",
      "/images/cards/2.jpg"
    ]
  },
  {
    id: "lucky_draw_set6",
    name: "Cosmic Luck",
    questionTemplates: ["Universal Winner", "Star Choice", "Galactic Fortune", "Cosmic Card"],
    cards: [
      "/images/cards/1.jpg",
      "/images/cards/2.jpg"
    ]
  }
];

export function getRandomTheme(): GameTheme {
  return GAME_THEMES[Math.floor(Math.random() * GAME_THEMES.length)];
}

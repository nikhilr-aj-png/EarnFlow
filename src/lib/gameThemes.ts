
export interface GameTheme {
  id: string;
  name: string;
  questionTemplates: string[];
  cards: string[]; // Array of 4 Image URLs
}

export const GAME_THEMES: GameTheme[] = [
  {
    id: "lucky_draw_set1",
    name: "Golden Fortune",
    questionTemplates: ["Find the Golden Ticket", "Who is the Lucky Winner?", "Select the Royal Card", "Ultimate Fortune Choice"],
    cards: [
      "/images/cards/1.png",
      "/images/cards/2.png",
      "/images/cards/3.png",
      "/images/cards/4.png"
    ]
  },
  {
    id: "lucky_draw_set2",
    name: "Diamond Rush",
    questionTemplates: ["Find the Diamond King", "Select the Rare Gem", "Luxury Choice", "Elite Member Pick"],
    cards: [
      "/images/cards/5.png",
      "/images/cards/6.png",
      "/images/cards/7.png",
      "/images/cards/8.png"
    ]
  },
  {
    id: "lucky_draw_set3",
    name: "Platinum Series",
    questionTemplates: ["Platinum Winner", "Select the Top Tier", "Exclusive Access Card", "Find the Prestige Pick"],
    cards: [
      "/images/cards/9.png",
      "/images/cards/10.png",
      "/images/cards/11.png",
      "/images/cards/12.png"
    ]
  },
  {
    id: "lucky_draw_set4",
    name: "Neon Nights",
    questionTemplates: ["Find the Glowing Card", "Night Rider Choice", "Cyber Luck", "Future Win"],
    cards: [
      "/images/cards/13.png",
      "/images/cards/14.png",
      "/images/cards/15.png",
      "/images/cards/16.png"
    ]
  },
  {
    id: "lucky_draw_set5",
    name: "Royal Elite",
    questionTemplates: ["King's Choice", "Select the Royal Seal", "Majestic Win", "Imperial Luck"],
    cards: [
      "/images/cards/17.png",
      "/images/cards/18.png",
      "/images/cards/19.png",
      "/images/cards/20.png"
    ]
  },
  {
    id: "lucky_draw_set6",
    name: "Cosmic Luck",
    questionTemplates: ["Universal Winner", "Star Choice", "Galactic Fortune", "Cosmic Card"],
    cards: [
      "/images/cards/21.png",
      "/images/cards/22.png",
      "/images/cards/23.png",
      "/images/cards/24.png"
    ]
  }
];

export function getRandomTheme(): GameTheme {
  return GAME_THEMES[Math.floor(Math.random() * GAME_THEMES.length)];
}

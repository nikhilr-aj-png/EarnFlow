
export interface GameTheme {
  id: string;
  name: string;
  questionTemplates: string[];
  cards: string[]; // Array of 4 Image URLs
}

export const GAME_THEMES: GameTheme[] = [
  {
    id: "classic",
    name: "Classic",
    questionTemplates: ["Find the Ace!", "Where is the Winner?", "Pick the Lucky Card", "Classic Choice"],
    cards: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop", // Portrait
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop"
    ]
  },
  {
    id: "neon",
    name: "Neon Nights",
    questionTemplates: ["Locate the Neon Glow", "Cyberpunk Choice", "Midnight Winner?", "Neon Luck"],
    cards: [
      "https://images.unsplash.com/photo-1496449903678-68ddcb189a24?w=400&h=600&fit=crop", // Neon abstract
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=600&fit=crop", // Cyberpunk
      "https://images.unsplash.com/photo-1563089145-599997674d42?w=400&h=600&fit=crop", // Neon sign
      "https://images.unsplash.com/photo-1534239697836-90e445f1b623?w=400&h=600&fit=crop"  // Neon lights
    ]
  },
  {
    id: "gold",
    name: "Luxury Gold",
    questionTemplates: ["Find the Golden Ticket", "Where is the Treasure?", "Royal Selection", "Millionaire's Pick"],
    cards: [
      "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=600&fit=crop", // Gold texture
      "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=600&fit=crop", // Gold coins
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=600&fit=crop", // Golden hour field
      "https://images.unsplash.com/photo-1570797197190-8e003a00c846?w=400&h=600&fit=crop"  // Luxury interior
    ]
  },
  {
    id: "nature",
    name: "Wild Nature",
    questionTemplates: ["Find the Hidden Animal", "Nature's Secret", "Wild Card Hunt", "Forest Mystery"],
    cards: [
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=600&fit=crop", // Foggy forest
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=600&fit=crop", // Woods
      "https://images.unsplash.com/photo-1501854140884-074cf2b21d25?w=400&h=600&fit=crop", // Mountain
      "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=600&fit=crop"  // Valley
    ]
  }
];

export function getRandomTheme(): GameTheme {
  return GAME_THEMES[Math.floor(Math.random() * GAME_THEMES.length)];
}

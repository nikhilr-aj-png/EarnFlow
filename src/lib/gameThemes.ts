
export interface GameTheme {
  id: string;
  name: string;
  questionTemplates: string[];
  cards: string[]; // Array of 4 Image URLs
}

export const GAME_THEMES: GameTheme[] = [
  {
    id: "cyber_nft",
    name: "Cyber Legends NFT",
    questionTemplates: ["Find the Rarest NFT", "Which Avatar is Valuable?", "Pick the Legendary Item", "Cyberpunk Choice"],
    cards: [
      "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=600&fit=crop", // 3D Abstract Face
      "https://images.unsplash.com/photo-1634193295627-1cdddf751ebf?w=400&h=600&fit=crop", // Crypto Coin/Art
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=600&fit=crop", // Abstract Fluid Art
      "https://images.unsplash.com/photo-1642104704074-907c0698b98d?w=400&h=600&fit=crop"  // Bored Ape style 3D
    ]
  },
  {
    id: "pixel_punks",
    name: "Pixel Punks Collection",
    questionTemplates: ["Locate the Pixel Punk", "Retro Crypto Hunt", "8-Bit Winner", "Rare Pixel Art"],
    cards: [
      "https://images.unsplash.com/photo-1637858868799-7f26a0640eb6?w=400&h=600&fit=crop", // Pixelish art
      "https://images.unsplash.com/photo-1615840287214-7ff58936c4cf?w=400&h=600&fit=crop", // Glitch Art
      "https://images.unsplash.com/photo-1614812513172-567d2fe96a75?w=400&h=600&fit=crop", // Space/Digital
      "https://images.unsplash.com/photo-1635322966219-c75e6116f0ce?w=400&h=600&fit=crop"  // Digital Cube
    ]
  },
  {
    id: "metaverse",
    name: "Metaverse Assets",
    questionTemplates: ["Find the Metaverse Key", "Virtual Luxury Item", "Next-Gen Asset", "Digital Land Choice"],
    cards: [
      "https://images.unsplash.com/photo-1614728853913-1e221a65d447?w=400&h=600&fit=crop", // Neon 3D
      "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop", // Cyber Grid
      "https://images.unsplash.com/photo-1563089145-599997674d42?w=400&h=600&fit=crop", // Neon text
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=600&fit=crop"  // Cyberpunk City
    ]
  },
  {
    id: "ape_club",
    name: "Ape & Animal Club",
    questionTemplates: ["Find the Rare Ape", "Which Spirit Animal?", "Crypto Zoo Winner", "Legendary Creature"],
    cards: [
      "https://images.unsplash.com/photo-1642543492481-44e81e3d1427?w=400&h=600&fit=crop", // 3D Character
      "https://images.unsplash.com/photo-1620336655052-b57972f3a3c4?w=400&h=600&fit=crop", // Abstract 3D shape
      "https://images.unsplash.com/photo-1560114928-40f1f1eb26a0?w=400&h=600&fit=crop", // Cute 3D Animal
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=600&fit=crop"  // 3D figure
    ]
  }
];

export function getRandomTheme(): GameTheme {
  return GAME_THEMES[Math.floor(Math.random() * GAME_THEMES.length)];
}

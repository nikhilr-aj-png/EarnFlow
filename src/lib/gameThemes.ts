
export interface GameTheme {
  id: string;
  name: string;
  questionTemplates: string[];
  cards: string[]; // Array of 4 Image URLs
}

export const GAME_THEMES: GameTheme[] = [
  {
    id: "pixel_punks_main",
    name: "Pixel Punks Gen 1",
    questionTemplates: ["Find the Rare Punk", "Which 8-bit Hero?", "Select the Pixel King", "Retro Punk Choice"],
    cards: [
      "https://images.unsplash.com/photo-1637858868799-7f26a0640eb6?w=400&h=600&fit=crop", // Pixel Character
      "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=600&fit=crop", // Glitch/Pixel Face
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=600&fit=crop", // Retro Game Screen
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=600&fit=crop"  // Tech Grid (Pixel-like)
    ]
  },
  {
    id: "voxel_verse",
    name: "Voxel Verse NFT",
    questionTemplates: ["Find the Voxel Item", "Blocky Winner", "Rare Voxel Asset", "Cube World Choice"],
    cards: [
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=600&fit=crop", // Blocky Character
      "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=400&h=600&fit=crop", // Voxel/VR
      "https://images.unsplash.com/photo-1614726365723-49cfa095074b?w=400&h=600&fit=crop", // Abstract Cubes
      "https://images.unsplash.com/photo-1496449903678-68ddcb189a24?w=400&h=600&fit=crop"  // Digital Noise
    ]
  },
  {
    id: "retro_arcade",
    name: "8-Bit Arcade",
    questionTemplates: ["Find the Glitch", "Retro High Score", "Arcade Legend", "8-Bit Treasure"],
    cards: [
      "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=400&h=600&fit=crop", // Retro Console
      "https://images.unsplash.com/photo-1523843268911-45a882919fec?w=400&h=600&fit=crop", // Pixelated Screen
      "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=600&fit=crop", // Gaming
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=600&fit=crop"  // Digital Glitch
    ]
  }
];

export function getRandomTheme(): GameTheme {
  return GAME_THEMES[Math.floor(Math.random() * GAME_THEMES.length)];
}

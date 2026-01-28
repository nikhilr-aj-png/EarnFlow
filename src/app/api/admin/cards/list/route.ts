import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const cardsDir = path.join(process.cwd(), "public", "images", "cards");

    if (!fs.existsSync(cardsDir)) {
      return NextResponse.json({ cards: [] });
    }

    const files = fs.readdirSync(cardsDir);

    // Filter for image files only
    const validExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const cardFiles = files
      .filter(file => validExtensions.includes(path.extname(file).toLowerCase()))
      .map(file => `/images/cards/${file}`);

    return NextResponse.json({ cards: cardFiles });
  } catch (error: any) {
    console.error("Error listing cards:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

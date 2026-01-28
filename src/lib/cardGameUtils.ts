import { Firestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as admin from 'firebase-admin';
import { awardReferralCommission } from "./referralUtils";

/**
 * Calculates the predicted winner based on "Least Bought" logic.
 */
export async function calculateSmartWinner(db: Firestore, gameId: string, startTime: number) {
  try {
    // 0. Fetch Game Data to detect card count
    const gameSnap = await db.collection("cardGames").doc(gameId).get();
    if (!gameSnap.exists) throw new Error("Game not found");
    const gameData = gameSnap.data()!;
    const cardCount = 2; // Strictly locked to 2 cards (KING & QUEEN)

    // Precise query: Only consider entries for THIS specific round
    const entriesQ = await db.collection("cardGameEntries")
      .where("gameId", "==", gameId)
      .where("gameStartTime", "==", startTime)
      .get();

    const cardVolumes = new Array(cardCount).fill(0);
    let totalVolume = 0;

    entriesQ.docs.forEach(e => {
      const data = e.data();
      const price = Number(data.price || 0);

      if (data.cardIndex !== undefined) {
        const idx = data.cardIndex;
        if (idx >= 0 && idx < cardCount) {
          cardVolumes[idx] += price;
          totalVolume += price;
        }
      } else {
        const selected = data.selectedCards || [];
        selected.forEach((idx: number) => {
          if (idx >= 0 && idx < cardCount) {
            cardVolumes[idx] += price;
            totalVolume += price;
          }
        });
      }
    });

    if (totalVolume === 0) {
      return {
        winnerIndex: Math.floor(Math.random() * cardCount),
        volumes: cardVolumes,
        method: 'random'
      };
    }

    let minVol = Infinity;
    let candidates: number[] = [];

    cardVolumes.forEach((vol, idx) => {
      if (vol < minVol) {
        minVol = vol;
        candidates = [idx];
      } else if (vol === minVol) {
        candidates.push(idx);
      }
    });

    const finalWinnerIndex = candidates[Math.floor(Math.random() * candidates.length)];

    return {
      winnerIndex: finalWinnerIndex,
      volumes: cardVolumes,
      method: 'smart_volume'
    };

  } catch (error) {
    console.error("Error calculating volume-based smart winner:", error);
    return {
      winnerIndex: Math.floor(Math.random() * 2), // Strictly 2-card fallback
      volumes: [0, 0],
      method: 'random_fallback'
    };
  }
}

export async function awardGameRewards(
  db: Firestore,
  gameId: string,
  winnerIndex: number,
  startTime: number,
  passedPrice?: number,
  passedTitle?: string
) {
  try {
    console.log(`[REWARDS] Starting for Game: ${gameId}, Winner: ${winnerIndex}, StartTime: ${startTime}`);

    const entriesQ = await db.collection("cardGameEntries")
      .where("gameId", "==", gameId)
      .where("gameStartTime", "==", startTime)
      .where("rewardProcessed", "==", false)
      .get();

    if (entriesQ.empty) {
      console.log(`[REWARDS] No pending entries found for Game: ${gameId}`);
      return { processed: 0, winners: 0 };
    }

    // Use passed values or fetch (fallback)
    let gamePrice = passedPrice || 0;
    let gameTitle = passedTitle || "Card Game";

    if (!passedPrice || !passedTitle) {
      const gameSnap = await db.collection("cardGames").doc(gameId).get();
      if (gameSnap.exists) {
        const d = gameSnap.data();
        if (!passedPrice) gamePrice = Number(d?.price || 0);
        if (!passedTitle) gameTitle = d?.question || "Card Game";
      }
    }

    const rewardAmount = gamePrice * 2;

    console.log(`[REWARDS] Processing ${entriesQ.size} entries. Total Price: ${gamePrice}, Reward: ${rewardAmount}`);

    let winnersCount = 0;
    const docs = entriesQ.docs;
    const CHUNK_SIZE = 100;

    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = db.batch();

      for (const doc of chunk) {
        const data = doc.data();
        const selected = data.selectedCards || [];
        const userId = data.userId;
        const entryPrice = data.price || gamePrice; // Use individual bet amount
        const rewardAmount = entryPrice * 2;

        if (!userId) {
          batch.update(doc.ref, { rewardProcessed: true, error: "Missing UserID" });
          continue;
        }

        if (selected.includes(winnerIndex)) {
          // Winner!
          const userRef = db.collection("users").doc(userId);
          batch.update(userRef, {
            coins: admin.firestore.FieldValue.increment(rewardAmount),
            totalEarned: admin.firestore.FieldValue.increment(rewardAmount),
            gameEarnings: admin.firestore.FieldValue.increment(rewardAmount),
            updatedAt: Timestamp.now()
          });

          // Metadata Activity
          const activityRef = db.collection("activities").doc();
          batch.set(activityRef, {
            userId,
            type: 'game_win',
            amount: rewardAmount,
            title: "Card Game Win 🏆",
            metadata: {
              gameId,
              winnerIndex,
              selectedCards: selected,
              gameTitle: gameTitle,
              betAmount: entryPrice
            },
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });

          batch.update(doc.ref, {
            rewardProcessed: true,
            won: true,
            rewardAmount: rewardAmount,
            updatedAt: Timestamp.now()
          });

          // Award Referral Commission (Post-transaction, non-blocking)
          awardReferralCommission(db, userId, rewardAmount, "Card Game Win")
            .catch(err => console.error("Game Commission Error:", err));

          winnersCount++;
        } else {
          // Loser
          batch.update(doc.ref, {
            rewardProcessed: true,
            won: false,
            updatedAt: Timestamp.now()
          });
        }
      }

      await batch.commit();
    }

    console.log(`[REWARDS] Finalized all batches. Paid: ${winnersCount} winners.`);
    return { processed: entriesQ.size, winners: winnersCount };
  } catch (error) {
    console.error(`[REWARDS] FATAL ERROR for Game ${gameId}:`, error);
    throw error;
  }
}

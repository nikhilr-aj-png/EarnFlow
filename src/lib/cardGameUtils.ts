import { Firestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as admin from 'firebase-admin';

/**
 * Calculates the predicted winner based on "Least Bought" logic.
 */
export async function calculateSmartWinner(db: Firestore, gameId: string, startTime: number) {
  try {
    const entriesQ = await db.collection("cardGameEntries")
      .where("gameId", "==", gameId)
      .get();

    const cardCounts = [0, 0, 0, 0];
    let totalTickets = 0;

    entriesQ.docs.forEach(e => {
      const selected = e.data().selectedCards || [];
      selected.forEach((idx: number) => {
        if (idx >= 0 && idx < 4) {
          cardCounts[idx]++;
          totalTickets++;
        }
      });
    });

    if (totalTickets === 0) {
      return {
        winnerIndex: Math.floor(Math.random() * 4),
        counts: cardCounts,
        method: 'random'
      };
    }

    let minVal = Infinity;
    let candidates: number[] = [];

    cardCounts.forEach((count, idx) => {
      if (count < minVal) {
        minVal = count;
        candidates = [idx];
      } else if (count === minVal) {
        candidates.push(idx);
      }
    });

    const finalWinnerIndex = candidates[Math.floor(Math.random() * candidates.length)];

    return {
      winnerIndex: finalWinnerIndex,
      counts: cardCounts,
      method: 'smart'
    };

  } catch (error) {
    console.error("Error calculating smart winner:", error);
    return {
      winnerIndex: Math.floor(Math.random() * 4),
      counts: [0, 0, 0, 0],
      method: 'random_fallback'
    };
  }
}

/**
 * Automatically credits winners for a finished game.
 */
export async function awardGameRewards(db: Firestore, gameId: string, winnerIndex: number, startTime: number) {
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

    const gameSnap = await db.collection("cardGames").doc(gameId).get();
    const gameData = gameSnap.data();
    const gamePrice = Number(gameData?.price || 0);
    const rewardAmount = gamePrice * 2;
    const gameTitle = gameData?.question || "Card Game";

    console.log(`[REWARDS] Processing ${entriesQ.size} entries. Total Price: ${gamePrice}, Reward Per Winner: ${rewardAmount}`);

    let winnersCount = 0;
    const docs = entriesQ.docs;
    const CHUNK_SIZE = 100; // 100 winners * 3 ops = 300 ops per batch (Safe under 500 limit)

    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = db.batch();

      for (const doc of chunk) {
        const data = doc.data();
        const selected = data.selectedCards || [];
        const userId = data.userId;

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
              gameTitle: gameTitle
            },
            createdAt: Timestamp.now()
          });

          batch.update(doc.ref, {
            rewardProcessed: true,
            won: true,
            rewardAmount: rewardAmount,
            updatedAt: Timestamp.now()
          });
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
      console.log(`[REWARDS] Batch committed: ${i} to ${Math.min(i + CHUNK_SIZE, docs.length)}`);
    }

    console.log(`[REWARDS] Finalized all batches. Paid: ${winnersCount} winners.`);
    return { processed: entriesQ.size, winners: winnersCount };
  } catch (error) {
    console.error(`[REWARDS] FATAL ERROR for Game ${gameId}:`, error);
    throw error;
  }
}

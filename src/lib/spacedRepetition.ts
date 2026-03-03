/**
 * Spaced Repetition System (SRS) for sign language learning.
 * Uses a simplified SM-2 algorithm to track sign difficulty and schedule reviews.
 */

const STORAGE_KEY = 'srs_sign_data';

export interface SRSCard {
  sign: string;
  /** Number of consecutive correct answers */
  streak: number;
  /** Ease factor (2.5 is default, lower = harder) */
  easeFactor: number;
  /** Interval in hours until next review */
  interval: number;
  /** Next review timestamp */
  nextReview: number;
  /** Total attempts */
  totalAttempts: number;
  /** Total correct */
  totalCorrect: number;
  /** Last practiced timestamp */
  lastPracticed: number;
}

function loadCards(): Record<string, SRSCard> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCards(cards: Record<string, SRSCard>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

/**
 * Record a quiz result for a sign.
 * @param sign - The sign that was practiced
 * @param correct - Whether the student got it right
 * @param responseTimeMs - How long it took (lower = better)
 */
export function recordResult(sign: string, correct: boolean, responseTimeMs: number = 5000) {
  const cards = loadCards();
  const now = Date.now();

  const card: SRSCard = cards[sign] || {
    sign,
    streak: 0,
    easeFactor: 2.5,
    interval: 0.5, // 30 minutes
    nextReview: now,
    totalAttempts: 0,
    totalCorrect: 0,
    lastPracticed: now,
  };

  card.totalAttempts++;
  card.lastPracticed = now;

  if (correct) {
    card.totalCorrect++;
    card.streak++;

    // Quality score: 0-5 based on response time
    // Fast + correct = high quality
    const quality = Math.max(0, Math.min(5, Math.round(5 - (responseTimeMs / 3000))));

    // SM-2 ease factor update
    card.easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    // Increase interval
    if (card.streak === 1) {
      card.interval = 1; // 1 hour
    } else if (card.streak === 2) {
      card.interval = 6; // 6 hours
    } else {
      card.interval = card.interval * card.easeFactor;
    }
  } else {
    card.streak = 0;
    card.interval = 0.5; // Reset to 30 minutes
    card.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
  }

  card.nextReview = now + card.interval * 3600 * 1000;
  cards[sign] = card;
  saveCards(cards);
}

/**
 * Get signs ordered by priority for review.
 * Signs that are due or overdue come first, then struggling signs.
 */
export function getReviewQueue(availableSigns: string[], count: number = 10): string[] {
  const cards = loadCards();
  const now = Date.now();

  type Scored = { sign: string; priority: number };
  const scored: Scored[] = availableSigns.map(sign => {
    const card = cards[sign];
    if (!card) {
      // Never practiced — highest priority
      return { sign, priority: 100 };
    }

    let priority = 0;

    // Overdue signs get high priority
    if (now >= card.nextReview) {
      const overdueHours = (now - card.nextReview) / (3600 * 1000);
      priority += 50 + Math.min(50, overdueHours * 2);
    }

    // Low accuracy signs get boosted
    const accuracy = card.totalAttempts > 0 ? card.totalCorrect / card.totalAttempts : 0;
    if (accuracy < 0.5) priority += 30;
    else if (accuracy < 0.7) priority += 15;

    // Low ease factor = hard sign
    if (card.easeFactor < 2.0) priority += 20;

    // Signs with broken streaks
    if (card.streak === 0 && card.totalAttempts > 0) priority += 10;

    return { sign, priority };
  });

  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, count).map(s => s.sign);
}

/**
 * Get all SRS stats for display
 */
export function getSRSStats(): {
  totalCards: number;
  dueNow: number;
  struggling: SRSCard[];
  mastered: SRSCard[];
  allCards: SRSCard[];
} {
  const cards = loadCards();
  const now = Date.now();
  const all = Object.values(cards);

  return {
    totalCards: all.length,
    dueNow: all.filter(c => now >= c.nextReview).length,
    struggling: all
      .filter(c => c.totalAttempts >= 3 && (c.totalCorrect / c.totalAttempts) < 0.5)
      .sort((a, b) => (a.totalCorrect / a.totalAttempts) - (b.totalCorrect / b.totalAttempts)),
    mastered: all
      .filter(c => c.streak >= 5 && c.easeFactor >= 2.5)
      .sort((a, b) => b.streak - a.streak),
    allCards: all.sort((a, b) => a.nextReview - b.nextReview),
  };
}

/**
 * Reset all SRS data
 */
export function resetSRSData() {
  localStorage.removeItem(STORAGE_KEY);
}

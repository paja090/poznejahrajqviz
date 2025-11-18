// utils/evaluateAnswer.js

// -------------------------------
// 1) KLASICKÉ HODNOCENÍ OTÁZEK
// -------------------------------
export function evaluateAnswer(question, answer) {
  if (!question) return false;

  const {
    type,
    correctAnswer,
    options,
    imageMode,
    tolerance,
    toleranceType,
  } = question;

  // --- ABC ---
  if (type === "abc") {
    return Number(answer) === Number(correctAnswer);
  }

  // --- OPEN ---
  if (type === "open") {
    if (typeof answer !== "string" || typeof correctAnswer !== "string") {
      return false;
    }
    return (
      answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
    );
  }

  // --- SPEED ---
  if (type === "speed") {
    // speed otázky se nehodnotí obsahem odpovědi,
    // správnost/odměna se řeší podle pořadí v evaluateSpeedScoring
    return true;
  }

  // --- IMAGE (obrázkové otázky) ---
  if (type === "image") {
    // IMAGE-ABC
    if (imageMode === "abc") {
      return Number(answer) === Number(correctAnswer);
    }

    // IMAGE-OPEN
    if (typeof answer !== "string" || typeof correctAnswer !== "string") {
      return false;
    }
    return (
      answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
    );
  }

  // --- MULTI SELECT ---
  if (type === "multi") {
    if (!Array.isArray(answer) || !Array.isArray(correctAnswer)) return false;
    if (answer.length !== correctAnswer.length) return false;

    const sortA = [...answer].sort();
    const sortC = [...correctAnswer].sort();

    return JSON.stringify(sortA) === JSON.stringify(sortC);
  }

  // --- NUMBER INPUT ---
  if (type === "number") {
    const a = Number(answer);
    const c = Number(correctAnswer);

    if (Number.isNaN(a) || Number.isNaN(c)) return false;

    // pokud tolerance není definovaná → ber jako 0 (přesná shoda)
    const safeTolerance =
      typeof tolerance === "number" && !Number.isNaN(tolerance)
        ? tolerance
        : 0;

    if (toleranceType === "percent") {
      const limit = (c * safeTolerance) / 100;
      return Math.abs(a - c) <= limit;
    }

    // absolute
    return Math.abs(a - c) <= safeTolerance;
  }

  // --- ARRANGE (seřazení) ---
  if (type === "arrange") {
    if (!Array.isArray(answer) || !Array.isArray(correctAnswer)) return false;
    return JSON.stringify(answer) === JSON.stringify(correctAnswer);
  }

  // fallback
  return false;
}

// -------------------------------
// 2) SPEED SCORING ENGINE
// -------------------------------
export function evaluateSpeedScoring(sortedAnswers, settings = {}) {
  // sortedAnswers = odpovědi seřazené podle timeSubmitted (nejrychlejší první)
  // settings.speedScoringMode: "first" | "top3" | "scale"

  if (!sortedAnswers || sortedAnswers.length === 0) return {};

  const result = {};
  const mode = settings.speedScoringMode || "first";

  if (mode === "first") {
    // pouze první hráč získá 1 bod
    const winner = sortedAnswers[0];
    result[winner.playerId] = 1;
    return result;
  }

  if (mode === "top3") {
    // váhy 3–2–1
    const weights = [3, 2, 1];

    sortedAnswers.slice(0, 3).forEach((ans, i) => {
      result[ans.playerId] = weights[i];
    });

    return result;
  }

  if (mode === "scale") {
    // rozložené body dle pořadí
    const total = sortedAnswers.length;
    sortedAnswers.forEach((ans, index) => {
      result[ans.playerId] = total - index; // 5 hráčů → 5,4,3,2,1
    });

    return result;
  }

  // fallback: jako "first"
  const winner = sortedAnswers[0];
  result[winner.playerId] = 1;
  return result;
}



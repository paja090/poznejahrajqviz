// utils/evaluateAnswer.js

/**
 * Vyhodnocení odpovědi podle typu otázky.
 * question: objekt otázky z Firestore
 * answerValue: to, co uložila Game stránka jako odpověď
 *
 * Podporované typy:
 * - abc
 * - open
 * - image (imageMode: "abc" | "open")
 * - multi (correctAnswer = pole indexů)
 * - number (correctAnswer = číslo, tolerance & toleranceType)
 * - arrange (correctAnswer = pole indexů správného pořadí)
 */
export function evaluateAnswer(question, answerValue) {
  if (!question) return false;

  const { type } = question;

  // ABC (klasické)
  if (type === "abc") {
    if (typeof question.correctAnswer !== "number") return false;
    return Number(answerValue) === Number(question.correctAnswer);
  }

  // Otevřená odpověď
  if (type === "open") {
    if (typeof question.correctAnswer !== "string") return false;
    if (typeof answerValue !== "string") return false;

    return (
      answerValue.trim().toLowerCase() ===
      question.correctAnswer.trim().toLowerCase()
    );
  }

  // Obrázková
  if (type === "image") {
    const mode = question.imageMode || inferImageMode(question);

    // IMAGE + ABC
    if (mode === "abc") {
      if (typeof question.correctAnswer !== "number") return false;
      return Number(answerValue) === Number(question.correctAnswer);
    }

    // IMAGE + OPEN
    if (mode === "open") {
      if (typeof question.correctAnswer !== "string") return false;
      if (typeof answerValue !== "string") return false;

      return (
        answerValue.trim().toLowerCase() ===
        question.correctAnswer.trim().toLowerCase()
      );
    }
  }

  // MULTI-SELECT (pole indexů správných odpovědí)
  if (type === "multi") {
    if (!Array.isArray(question.correctAnswer)) return false;
    if (!answerValue) return false;

    // Podpora: answerValue může být:
    // - pole indexů
    // - pole booleanů [true,false,...]
    let answerIndices = [];

    if (Array.isArray(answerValue)) {
      if (answerValue.length && typeof answerValue[0] === "boolean") {
        answerIndices = answerValue
          .map((v, i) => (v ? i : -1))
          .filter((i) => i >= 0);
      } else {
        answerIndices = answerValue.map((v) => Number(v)).filter((v) => !isNaN(v));
      }
    } else {
      // např. "0,2"
      if (typeof answerValue === "string") {
        answerIndices = answerValue
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n));
      }
    }

    const correct = new Set(
      question.correctAnswer.map((v) => Number(v)).filter((v) => !isNaN(v))
    );
    const given = new Set(answerIndices);

    if (correct.size !== given.size) return false;
    for (const c of correct) {
      if (!given.has(c)) return false;
    }
    return true;
  }

  // ČÍSELNÁ
  if (type === "number") {
    const correct = Number(question.correctAnswer);
    const tol = Number(question.tolerance ?? 0);
    const tolType = question.toleranceType || "absolute";

    if (Number.isNaN(correct)) return false;

    const val = Number(answerValue);
    if (Number.isNaN(val)) return false;

    if (tolType === "percent") {
      const diffPercent = Math.abs(val - correct) / (correct || 1);
      return diffPercent * 100 <= tol;
    }

    // absolute
    const diff = Math.abs(val - correct);
    return diff <= tol;
  }

  // SEŘAZENÍ (ARRANGE)
  if (type === "arrange") {
    if (!Array.isArray(question.correctAnswer)) return false;
    if (!Array.isArray(answerValue)) return false;

    if (question.correctAnswer.length !== answerValue.length) {
      return false;
    }

    for (let i = 0; i < question.correctAnswer.length; i++) {
      if (Number(question.correctAnswer[i]) !== Number(answerValue[i])) {
        return false;
      }
    }
    return true;
  }

  // fallback – raději false než chyba
  return false;
}

/**
 * Pokud imageMode není uložen, zkusíme ho odhadnout z dat.
 */
function inferImageMode(question) {
  if (!question) return "abc";
  const hasOptions = Array.isArray(question.options) && question.options.length;
  if (hasOptions && typeof question.correctAnswer === "number") {
    return "abc";
  }
  return "open";
}

/**
 * Vyhodnocení speed otázky – vrátí mapu {playerId: points}
 * sortedAnswers: pole odpovědí seřazených podle času
 * settings: object z room.settings, může obsahovat speedScoringMode:
 *  - "first" (default) → 1 bod pro nejrychlejšího
 *  - "top3" → 3,2,1 body pro top 3
 *  - "scale" → škála podle pozice (max 5 bodů)
 */
export function evaluateSpeedScoring(sortedAnswers, settings = {}) {
  const mode = settings.speedScoringMode || "first";
  const result = {};

  if (!Array.isArray(sortedAnswers) || sortedAnswers.length === 0) {
    return result;
  }

  if (mode === "top3") {
    const winners = sortedAnswers.slice(0, 3);
    const weights = [3, 2, 1];
    winners.forEach((ans, i) => {
      if (!ans.playerId) return;
      result[ans.playerId] = (result[ans.playerId] || 0) + weights[i];
    });
    return result;
  }

  if (mode === "scale") {
    const maxPoints = 5;
    const total = sortedAnswers.length;
    sortedAnswers.forEach((ans, i) => {
      if (!ans.playerId) return;
      const points = Math.max(
        1,
        maxPoints -
          Math.floor((i / (total - 1 || 1)) * (maxPoints - 1))
      );
      result[ans.playerId] = (result[ans.playerId] || 0) + points;
    });
    return result;
  }

  // default: only first gets 1 point
  const first = sortedAnswers[0];
  if (first?.playerId) {
    result[first.playerId] = 1;
  }
  return result;
}


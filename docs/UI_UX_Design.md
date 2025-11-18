# Poznej & Hraj – Live Quiz App UI/UX & System Blueprint

## 1. Brand Narrative & Experience Goals
- **Mood:** neon nightlife energy meets premium event production; UI feels like a DJ console fused with a futuristic trivia arena.
- **Tone:** playful yet competitive, with confident microcopy ("Ready to light up the stage?" instead of "Submit").
- **Experience pillars:**
  1. **Instant clarity** – all screens lead with the primary action, hierarchy enforced via glow accents.
  2. **Rhythmic motion** – subtle looping particles and pulsing gradients maintain momentum.
  3. **Celebratory payoffs** – reward every interaction (points, joining, submitting) with feedback.

---

## 2. Screen Blueprints

### 2.1 Join Flow (Players)
- **Hero gradient card** centered on dark background (#071022) with soft blur (backdrop-filter: blur(24px)).
- **Form layout (mobile-first):** stacked inputs (Room Code, Nickname) with glowing outline, avatar carousel below.
- **Avatar picker:** horizontal scroll of neon icon chips (planet, vinyl, lightning). Selected avatar lifts 8px with cyan shadow.
- **State: "Waiting for host"**
  - Animated orbit of particles around a central glass orb. Text: "Čekáme na start hry…" with shimmering ellipsis.
  - CTA switches to disabled gradient (opacity 0.5) while waiting.
- **Microcopy:** "Zadej kód, vyber alter ego, připrav se zazářit."

### 2.2 Join Flow (Moderator)
- **Create Room panel:** two-column card (desktop). Left: generate button + room code. Right: QR + share URL.
- **Room code** displayed as "LED" digits (font: Orbitron). Copy + share icons with ripple on hover.
- **Player roster chips:** responsive grid of avatar badges showing nickname + status (ready, connecting). New player pulses turquoise.

### 2.3 Gameplay Question Types
Each question card shares scaffold: top timer strip, question stem area, answer grid. Animations described in §7.

| Type | Mobile Layout | Desktop Layout | Unique Elements |
| --- | --- | --- | --- |
| **ABC / Multi-choice** | 2x2 grid of pill buttons; tap ripple + lock-in glow. | 2 columns with dynamic width; hover neon border. | After selection, chosen answer saturates while others dim. |
| **Rychlovka** | Giant central button occupying 60% height; radial countdown. | Split screen: prompt left, leaderboard surge right. | Button shows "První trefa vyhrává" text; once tapped, locks with lightning animation. |
| **Otevřená odpověď** | Glass textarea with glowing caret; send icon floats. | Wider text field with inline suggestions (host hints). | Upon submit, field shrinks and shows "🔒 Odesláno" chip. |
| **Výběr obrázku** | Carousel of square cards with image overlay gradient; swipe gestures. | Masonry grid (2x2). | Selection adds cyan border + checkmark badge. |
| **Emoji odpověď** | 3–5 large emoji buttons with bounce. | Align center with label tooltips. | On submit, emoji animates upward like confetti. |
| **Anketa** | Ranked cards with drag-to-vote; release shows glow. | Desktop supports drag or click ranking with numbered pills. | After lock, card displays your ranking number and subtle scale animation. |

### 2.4 Results After Each Question
- **Leaderboard card:** top 5 with gradient bars (1st = magenta/cyan, 2nd = violet, 3rd = teal, others = slate).
- **Your position ribbon:** anchored bottom, sticky, showing delta (▲+120). Background blur ensures readability.
- **Confetti mode:** triggered when someone new takes #1. Neon confetti streaks with additive blend.

### 2.5 Final Results
- **Podium:** 3D glass pedestals, 1st elevated 24px. Each pedestal has animated glow band.
- **Winner banner:** full-width gradient with spark particles and CTA buttons ("Sdílet", "Hrajeme další kolo"). Buttons share icon + label.
- **Player stats drawer:** collapsible section listing accuracy, fastest tap, streak.

### 2.6 Moderator Dashboard (Desktop-first)
- **Layout:** 3-column grid.
  1. **Timeline playlist:** draggable cards for each question type, color-coded by type (multi-choice = purple, emoji = pink, etc.).
  2. **Live board:** shows current question, timer, stats on responses, quick toggles (lock answers, give hints).
  3. **Player feed:** scrollable list with avatars, response preview chips, manual score controls (increment/decrement with hold to repeat).
- **Top bar:** "Live status" pill showing text ("10 hráčů odpovídá…"), includes pulsating dot.
- **Action row:** "Spustit další otázku" (primary neon) + "Pozastavit" (ghost button) with keyboard shortcut hints.

---

## 3. Design System

### 3.1 Colors
| Token | Value | Usage |
| --- | --- | --- |
| `bg.dark` | #071022 | Global background.
| `primary.gradient` | linear-gradient(120deg, #7A1FFF → #FF1F8B → #21F3FF) | CTAs, hero cards.
| `secondary.violet` | #5B1CFF | Secondary buttons, highlights.
| `accent.teal` | #21F3FF | Timers, success states.
| `accent.pink` | #FF4EDB | Alerts, selection.
| `success` | #53F7B5 | Correct answers, positive toasts.
| `error` | #FF5F7E | Errors, timeouts.
| `glow` | rgba(33, 243, 255, 0.45) | Box-shadows, neon outlines.

### 3.2 Typography
- **Display / Headings:** `Space Grotesk` (700). Uppercase for key stats.
- **Body:** `Inter` (400–600) for readability.
- **Numeric / Timer:** `Orbitron` (600) for countdown clocks.

### 3.3 Elevation & Glassmorphism
- Base card: background rgba(7,16,34,0.8), border 1px solid rgba(255,255,255,0.08), blur 24px, shadow 0 20px 40px rgba(0,0,0,0.5) + outer glow.
- Rounded corners: cards 28px, buttons 999px (pill) or 20px for secondary.
- Spacing scale: 4px * n (4,8,12,16,24,32,40).
- Grid: 12-column desktop, 4-column mobile.

### 3.4 Components
- **Buttons**
  - `PrimaryButton`: gradient background, neon border, soft shadow. States: hover (shift gradient), active (press depth), disabled (desaturated, 0.4 opacity).
  - `TimerButton`: circular, contains countdown text and ring.
  - `GhostButton`: transparent, neon outline, blur glow on hover.
- **Cards**: glass with gradient accent stripe at top.
- **Progress Bars**: dual-layer (background translucent, foreground gradient). Timer ring uses SVG stroke with glow filter.
- **Modals**: centered, blurred background overlay (rgba(7,16,34,0.85)), drop-in animation.
- **Avatar list**: overlapping chips with status lights.
- **Scoreboard list**: row cards with ranking number, name, points, delta arrow.
- **Countdown clock**: circular with numeric center, stroke animates with easing.
- **Toasts**: slide-in from top-right, contain icon + text, color-coded by status.

---

## 4. Animation Playbook
- **Start game:** rooms dim, center orb pulses, CTA slides upward; confetti sparks ignite.
- **Between questions:** card flips upward, blur transition reveals next question with parallax background.
- **Answer submission:** button locks, emits neon ripple, toast slides in ("Odpověď odeslána").
- **Leaderboard jump:** player row bounces upward with trailing glow.
- **CTA pulse:** breathing animation (scale 1 → 1.05 → 1) synced with glow intensity.
- **New player join:** avatar slides from bottom with particle tail.
- **Moderator actions:** when awarding points, scoreboard flashes with positive tint.

---

## 5. UX Principles
- **Svižnost:** Preload next question assets, show micro-progress ("Host připravuje otázku…"). Keep idle loops (particles) to imply activity.
- **Zero dead time:** Provide mini trivia facts or "emoji vote" mini-interactions while waiting.
- **Competitive cues:** show streak badges, "You’re 2 taps from top 3" messages.
- **Engagement loops:** after each round, highlight achievements (fastest tap, creative answer). Encourage sharing via gradient CTA.
- **Micro-interactions:** haptic cues (if available), subtle sound cues per action (join, submit, countdown beep, leaderboard). Each <400ms to stay snappy.

---

## 6. Architecture & Export for Developers

### 6.1 React Component Tree (excerpt)
```
src/
  components/
    layout/
      GlassCard.jsx
      NeonBackground.jsx
    inputs/
      RoomCodeInput.jsx
      AvatarPicker.jsx
      AnswerButton.jsx
      EmojiSelector.jsx
      ImageOption.jsx
    feedback/
      CountdownRing.jsx
      ToastStack.jsx
      LeaderboardCard.jsx
      ConfettiCanvas.jsx
    moderator/
      TimelinePanel.jsx
      PlayerFeed.jsx
      ControlDeck.jsx
    game/
      QuestionStage.jsx
      WaitingRoom.jsx
      ResultPodium.jsx
  pages/
    JoinPlayer.jsx
    HostLobby.jsx
    QuestionView.jsx
    ResultsRound.jsx
    ResultsFinal.jsx
    ModeratorDashboard.jsx
  hooks/
    useCountdown.js
    useConfetti.js
    usePlayersListener.js
    useQuestionTimeline.js
  styles/
    tokens.css
    animations.css
  data/
    questionTypes.js
    avatars.js
```

### 6.2 Component Props (samples)
- `RoomCodeInput`
  - `value: string`
  - `onChange(code: string)`
  - `status: "default" | "error" | "locked"`
  - `helperText?: string`
- `AvatarPicker`
  - `avatars: Avatar[]`
  - `selectedId: string`
  - `onSelect(id: string)`
- `QuestionStage`
  - `type: QuestionType`
  - `question: QuestionPayload`
  - `timer: number`
  - `onSubmit(answer: AnswerPayload)`
  - `locked: boolean`
- `LeaderboardCard`
  - `entries: Array<{ rank: number; name: string; score: number; delta: number; isYou?: boolean }>`
- `TimelinePanel`
  - `questions: QuestionMeta[]`
  - `currentIndex: number`
  - `onReorder(src: number, dest: number)`
  - `onSelect(index: number)`

### 6.3 Data Models (Firestore-oriented)
```ts
QuizRoom {
  id: string;
  status: "waiting" | "live" | "results";
  createdAt: Timestamp;
  settings: {
    allowLateJoin: boolean;
    showLeaderboardEachRound: boolean;
    questionDuration: number;
  };
  currentQuestionId: string | null;
}

Player {
  id: string;
  roomId: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  joinedAt: Timestamp;
}

Question {
  id: string;
  roomId: string;
  type: "multi" | "speed" | "open" | "image" | "emoji" | "poll";
  prompt: string;
  options?: Option[];
  media?: { type: "image" | "audio"; url: string };
  countdown: number;
  correctAnswer?: string | string[];
}

Answer {
  id: string;
  questionId: string;
  playerId: string;
  payload: string | string[];
  submittedAt: Timestamp;
  speedRank?: number;
  pointsAwarded: number;
}
```

### 6.4 Frontend Workflow
1. **Join:** Client hits `/rooms/:id` to validate code, writes `Player` doc.
2. **Waiting room:** subscribe to `QuizRoom` + `Players` collection, animate statuses.
3. **Game loop:** host triggers `currentQuestionId`; clients subscribe to `Question` + `Answers`. `useCountdown` handles timer.
4. **Submission:** write to `Answers`; server-side function assigns base points; host can adjust via dashboard.
5. **Results:** derived leaderboard computed from `Players` scores; show after each question.
6. **Finale:** set `status = "results"`; show podium; allow "next round" to clone playlist.

### 6.5 Backend Workflow
- Firebase Cloud Functions (or Supabase Edge) handle:
  - Validating room creation and generating codes.
  - Auto awarding points based on correctness + speed (for speed round, first answer gets bonus).
  - Emitting events (e.g., `onAnswerCreate` triggers scoreboard update).
  - Webhook for analytics/exports.
- Firestore security rules enforce room scoping (players can only read/write their room, answers can only be written once per question).

---

## 7. Accessibility & Responsiveness
- Minimum touch target 48px, high contrast text (#F4F8FF on dark backgrounds).
- Motion-reduced mode toggles slower/less intense animations.
- Breakpoints: 0–599 (mobile), 600–1023 (tablet), 1024+ (desktop). Moderator dashboard only available ≥1024.

---

## 8. Sound & Haptics Palette (optional but recommended)
- **Join chime:** short rising synth.
- **Countdown tick:** per second with last 3 seconds emphasized.
- **Submit swoosh:** airy synth to reinforce success.
- **Leaderboard pop:** upward arpeggio.
- **Confetti blast:** layered spark sound.

---

## 9. Implementation Tips
- Use CSS variables for tokens; pair with Tailwind or CSS Modules.
- Prefer Framer Motion for staged animations; combine with GSAP for confetti.
- Canvas-based particle background to keep CPU low (limit 80 particles mobile).
- Preload gradients as SVG overlays for crispness.

---

## 10. Deliverables Summary
- **Screen specs:** join, waiting, gameplay (6 modes), inter-round results, final results, moderator dashboard.
- **Design system tokens + components** ready for implementation.
- **Architecture map** for developers (components, props, data models, workflows).
- **Animation + UX philosophy** ensures engaging, neon-forward experience true to Poznej & Hraj.

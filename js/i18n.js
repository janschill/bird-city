/**
 * Internationalization module for Bird City / Spiel Stadt Plan.
 *
 * Supports English (en) and German (de).
 * Auto-detects from navigator.language, with localStorage override.
 */

const LANG_KEY = 'birdcity_lang';

const translations = {
  en: {
    // App name
    appName: 'Bird City',
    subtitle: 'A daily city-building puzzle',

    // Welcome screen
    puzzleNumber: 'Puzzle #%d',
    hardMode: 'Hard Mode',
    hardModeDesc: 'No undo, no skip',
    play: 'Play',
    howToPlay: 'How to Play',

    // Stats labels
    played: 'Played',
    streak: 'Streak',
    maxStreak: 'Max Streak',
    best: 'Best',

    // HUD
    score: 'Score: %d',
    tileCounter: 'Tile %d / %d',
    done: 'Done!',

    // Controls
    undo: 'UNDO',
    place: 'PLACE',
    skip: 'SKIP',
    endRound: 'End Round',

    // Post-game
    share: 'Share',
    details: 'Details',
    shareResult: 'Share Result',
    copiedToClipboard: 'Copied to clipboard!',

    // Game over modal
    puzzleLabel: 'Bird City #%d',
    puzzleLabelExtra: 'Bird City #%d (Extra)',
    hardModeBadge: 'Hard Mode',

    // Already completed
    alreadyPlayed: 'Already Played!',
    alreadyCompletedMain: "You've already completed today's puzzle.",
    alreadyCompletedExtra: "You've already completed this extra board.",
    comeBackTomorrow: 'Come back tomorrow for a new puzzle!',
    playExtraBoard: 'Play Extra Board',

    // Statistics modal
    statistics: 'Statistics',
    averageScore: 'Average score',
    gamesPlayed: 'Games played',

    // Help modal
    helpTitle: 'How to Play',
    helpIntro: 'Build your city by placing colored tiles on the grid. Each day everyone gets the same tiles in the same order.',
    helpPlacementTitle: 'Placement',
    helpPlacement: 'Tiles must be placed <strong>next to the river</strong> or <strong>next to existing tiles</strong>. You grow your city outward from the river.',
    helpControlsTitle: 'Controls',
    helpControls: '<strong>Tap the grid</strong> or <strong>drag from the preview</strong> to position a tile.<br><strong>Tap the preview</strong> or press <strong>R</strong> to rotate.<br>Press <strong>Place</strong> to confirm.<br><strong>Skip</strong> (S) to discard a tile (-2 pts).<br><strong>Undo</strong> (U / Ctrl+Z) to take back your last move (once).<br><strong>End Round</strong> (E) to stop early &mdash; remaining tiles won\u2019t cost skip penalties.',
    helpHardModeTitle: 'Hard Mode',
    helpHardMode: 'Toggle on the start screen. No undo, no skip &mdash; every tile must be placed. Share results show \u{1F525} to prove it.',
    helpColorsTitle: 'Colors',
    helpScoringTitle: 'Scoring',
    helpScoring: 'Your <strong>largest connected group</strong> of each color scores points equal to its size. Groups connect horizontally and vertically (not diagonally).<br>\u{1F332} Trees left uncovered: +2 each<br>\u{1FAA8} Rocks left uncovered: -2 each<br>Open fields (uncovered): -1 each<br>Skipped tiles: -2 each',

    // End round
    endRoundTitle: 'End Round?',
    endRoundConfirm: 'End the round with %d tiles remaining? Unused tiles won\u2019t count as skipped.',
    endRoundCancel: 'Cancel',
    endRoundConfirmBtn: 'End Round',

    // Score breakdown
    colorGroup: '%s group',
    treesPreserved: '\u{1F332} Trees preserved (%d)',
    uncoveredRocks: '\u{1FAA8} Uncovered rocks (%d)',
    openFields: 'Open fields (%d)',
    skippedTiles: 'Skipped tiles (%d)',
    endedEarly: 'Round ended early (%d unused)',
    total: 'Total',

    // Color names
    rust: 'Rust',
    sand: 'Sand',
    sage: 'Sage',

    // Language
    language: 'Language',

    // Share text
    shareLine: 'Bird City #%d',

    // Date locale
    dateLocale: 'en-US',
  },

  de: {
    // App name
    appName: 'Spiel Stadt Plan',
    subtitle: 'Ein t\u00e4gliches Stadtbau-R\u00e4tsel',

    // Welcome screen
    puzzleNumber: 'R\u00e4tsel #%d',
    hardMode: 'Schwerer Modus',
    hardModeDesc: 'Kein Zur\u00fcck, kein Passen',
    play: 'Spielen',
    howToPlay: 'Spielanleitung',

    // Stats labels
    played: 'Gespielt',
    streak: 'Serie',
    maxStreak: 'Beste Serie',
    best: 'Bestes',

    // HUD
    score: 'Punkte: %d',
    tileCounter: 'Teil %d / %d',
    done: 'Fertig!',

    // Controls
    undo: 'ZUR\u00dcCK',
    place: 'SETZEN',
    skip: 'PASSEN',
    endRound: 'Runde beenden',

    // Post-game
    share: 'Teilen',
    details: 'Details',
    shareResult: 'Ergebnis teilen',
    copiedToClipboard: 'In die Zwischenablage kopiert!',

    // Game over modal
    puzzleLabel: 'Spiel Stadt Plan #%d',
    puzzleLabelExtra: 'Spiel Stadt Plan #%d (Extra)',
    hardModeBadge: 'Schwerer Modus',

    // Already completed
    alreadyPlayed: 'Bereits gespielt!',
    alreadyCompletedMain: 'Du hast das heutige R\u00e4tsel bereits gel\u00f6st.',
    alreadyCompletedExtra: 'Du hast dieses Zusatzbrett bereits gespielt.',
    comeBackTomorrow: 'Komm morgen f\u00fcr ein neues R\u00e4tsel wieder!',
    playExtraBoard: 'Zusatzbrett spielen',

    // Statistics modal
    statistics: 'Statistiken',
    averageScore: 'Durchschnitt',
    gamesPlayed: 'Spiele gespielt',

    // Help modal
    helpTitle: 'Spielanleitung',
    helpIntro: 'Baue deine Stadt, indem du farbige Teile auf das Raster legst. Jeden Tag bekommt jeder die gleichen Teile in der gleichen Reihenfolge.',
    helpPlacementTitle: 'Platzierung',
    helpPlacement: 'Teile m\u00fcssen <strong>neben dem Fluss</strong> oder <strong>neben bestehenden Teilen</strong> platziert werden. Du baust deine Stadt vom Fluss aus nach au\u00dfen.',
    helpControlsTitle: 'Steuerung',
    helpControls: '<strong>Tippe auf das Raster</strong> oder <strong>ziehe von der Vorschau</strong>, um ein Teil zu positionieren.<br><strong>Tippe auf die Vorschau</strong> oder dr\u00fccke <strong>R</strong> zum Drehen.<br>Dr\u00fccke <strong>Setzen</strong> zum Best\u00e4tigen.<br><strong>Passen</strong> (S) um ein Teil abzulegen (-2 Pkt).<br><strong>Zur\u00fcck</strong> (U / Strg+Z) um den letzten Zug r\u00fcckg\u00e4ngig zu machen (einmal).<br><strong>Runde beenden</strong> (E) um vorzeitig aufzuh\u00f6ren &mdash; verbleibende Teile kosten keine Strafpunkte.',
    helpHardModeTitle: 'Schwerer Modus',
    helpHardMode: 'Auf dem Startbildschirm umschalten. Kein Zur\u00fccknehmen, kein Passen &mdash; jedes Teil muss platziert werden. Geteilte Ergebnisse zeigen \u{1F525} als Beweis.',
    helpColorsTitle: 'Farben',
    helpScoringTitle: 'Wertung',
    helpScoring: 'Deine <strong>gr\u00f6\u00dfte zusammenh\u00e4ngende Gruppe</strong> jeder Farbe ergibt Punkte gleich ihrer Gr\u00f6\u00dfe. Gruppen verbinden sich horizontal und vertikal (nicht diagonal).<br>\u{1F332} Nicht bedeckte B\u00e4ume: +2 je<br>\u{1FAA8} Nicht bedeckte Felsen: -2 je<br>Offene Felder (unbedeckt): -1 je<br>\u00dcbersprungene Teile: -2 je',

    // End round
    endRoundTitle: 'Runde beenden?',
    endRoundConfirm: 'Runde mit %d verbleibenden Teilen beenden? Unbenutzte Teile werden nicht als \u00fcbersprungen gez\u00e4hlt.',
    endRoundCancel: 'Abbrechen',
    endRoundConfirmBtn: 'Beenden',

    // Score breakdown
    colorGroup: '%s-Gruppe',
    treesPreserved: '\u{1F332} Erhaltene B\u00e4ume (%d)',
    uncoveredRocks: '\u{1FAA8} Unbedeckte Felsen (%d)',
    openFields: 'Offene Felder (%d)',
    skippedTiles: '\u00dcbersprungene Teile (%d)',
    endedEarly: 'Vorzeitig beendet (%d unbenutzt)',
    total: 'Gesamt',

    // Color names
    rust: 'Rost',
    sand: 'Sand',
    sage: 'Salbei',

    // Language
    language: 'Sprache',

    // Share text
    shareLine: 'Spiel Stadt Plan #%d',

    // Date locale
    dateLocale: 'de-DE',
  },
};

let currentLang = 'en';

/**
 * Detect language from browser or stored preference.
 */
function detectLanguage() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored && translations[stored]) return stored;
  } catch { /* ignore */ }

  const nav = navigator.language || navigator.userLanguage || 'en';
  if (nav.startsWith('de')) return 'de';
  return 'en';
}

/**
 * Initialize i18n. Call once at startup.
 */
export function initI18n() {
  currentLang = detectLanguage();
  document.documentElement.lang = currentLang;
}

/**
 * Get a translated string by key.
 */
export function t(key) {
  const dict = translations[currentLang] || translations.en;
  return dict[key] !== undefined ? dict[key] : (translations.en[key] || key);
}

/**
 * Get the current language code.
 */
export function getLang() {
  return currentLang;
}

/**
 * Set language and persist. Returns the new language code.
 */
export function setLang(lang) {
  if (!translations[lang]) return currentLang;
  currentLang = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch { /* ignore */ }
  return currentLang;
}

/**
 * Get list of available languages as [code, nativeName] pairs.
 */
export function getAvailableLanguages() {
  return [
    ['en', 'English'],
    ['de', 'Deutsch'],
  ];
}

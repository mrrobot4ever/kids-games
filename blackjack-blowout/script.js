const STORAGE_KEY = 'blackjack-blowout-save-v1';
const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CHIP_VALUES = [1000, 2500, 5000];

const els = {
  bankrollValue: document.getElementById('bankrollValue'),
  currentBetValue: document.getElementById('currentBetValue'),
  dealerTotal: document.getElementById('dealerTotal'),
  playerSummary: document.getElementById('playerSummary'),
  statusBanner: document.getElementById('statusBanner'),
  tableMessage: document.getElementById('tableMessage'),
  campaignState: document.getElementById('campaignState'),
  dealerHand: document.getElementById('dealerHand'),
  playerHands: document.getElementById('playerHands'),
  shoeFill: document.getElementById('shoeFill'),
  shoeCount: document.getElementById('shoeCount'),
  shoeCountMobile: document.getElementById('shoeCountMobile'),
  shoeStack: document.getElementById('shoeStack'),
  lastRoundText: document.getElementById('lastRoundText'),
  roundStateMobile: document.getElementById('roundStateMobile'),
  roundPhaseLabel: document.getElementById('roundPhaseLabel'),
  soundToggle: document.getElementById('soundToggle'),
  dealBtn: document.getElementById('dealBtn'),
  clearBetBtn: document.getElementById('clearBetBtn'),
  rebetBtn: document.getElementById('rebetBtn'),
  hitBtn: document.getElementById('hitBtn'),
  standBtn: document.getElementById('standBtn'),
  doubleBtn: document.getElementById('doubleBtn'),
  splitBtn: document.getElementById('splitBtn'),
  chipRow: document.getElementById('chipRow'),
};

let audioEnabled = true;
let audioCtx = null;
let state = loadGame() || makeFreshState();
coerceState(state);
render();

els.chipRow.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-chip]');
  if (!btn) return;
  addChip(Number(btn.dataset.chip));
});
els.dealBtn.addEventListener('click', startRound);
els.clearBetBtn.addEventListener('click', clearBet);
els.rebetBtn.addEventListener('click', rebet);
els.hitBtn.addEventListener('click', () => playerAction('hit'));
els.standBtn.addEventListener('click', () => playerAction('stand'));
els.doubleBtn.addEventListener('click', () => playerAction('double'));
els.splitBtn.addEventListener('click', () => playerAction('split'));
els.soundToggle.addEventListener('click', toggleSound);

function makeFreshState() {
  return {
    bankroll: 50000,
    status: 'betting',
    shoe: shuffle(createDoubleDeck()),
    dealer: { cards: [] },
    playerHands: [],
    activeHandIndex: 0,
    currentBet: 0,
    previousBet: 0,
    lastRound: null,
    stats: { roundsPlayed: 0, handsWon: 0, handsLost: 0, handsPushed: 0, blackjacks: 0 },
    needsShuffle: false,
    gameWon: false,
  };
}

function coerceState(s) {
  if (!s.shoe || !Array.isArray(s.shoe) || !s.shoe.length) s.shoe = shuffle(createDoubleDeck());
  if (!s.dealer) s.dealer = { cards: [] };
  if (!Array.isArray(s.playerHands)) s.playerHands = [];
  if (!s.stats) s.stats = { roundsPlayed: 0, handsWon: 0, handsLost: 0, handsPushed: 0, blackjacks: 0 };
  if (typeof s.bankroll !== 'number' || Number.isNaN(s.bankroll)) s.bankroll = 50000;
  if (typeof s.currentBet !== 'number') s.currentBet = 0;
}

function createDoubleDeck() {
  const deck = [];
  for (let d = 0; d < 2; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) deck.push({ rank, suit });
    }
  }
  return deck;
}

function shuffle(cards) {
  const a = [...cards];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawCard() {
  if (state.shoe.length === 0) state.shoe = shuffle(createDoubleDeck());
  return state.shoe.pop();
}

function evaluateHand(cards) {
  let total = 0;
  let aceCount = 0;
  for (const card of cards) {
    if (card.rank === 'A') { total += 11; aceCount++; }
    else if (['K', 'Q', 'J'].includes(card.rank)) total += 10;
    else total += Number(card.rank);
  }
  let acesAsEleven = aceCount;
  while (total > 21 && acesAsEleven > 0) { total -= 10; acesAsEleven--; }
  return { total, soft: acesAsEleven > 0, blackjack: cards.length === 2 && total === 21, bust: total > 21 };
}

function isNaturalBlackjack(hand) {
  const ev = evaluateHand(hand.cards);
  return ev.blackjack && !hand.isSplitHand;
}

function createHand(bet) {
  return { cards: [], bet, isFinished: false, hasDoubled: false, isSplitHand: false, splitFromAces: false, result: null, payout: 0 };
}

function addChip(value) {
  if (state.status !== 'betting') return;
  if (!CHIP_VALUES.includes(value)) return;
  if (state.currentBet + value > state.bankroll) return setBanner('Not enough chips for that bet.');
  state.currentBet += value;
  playTone(480, 0.04, 'triangle');
  persistAndRender();
}

function clearBet() {
  if (state.status !== 'betting') return;
  state.currentBet = 0;
  persistAndRender();
}

function rebet() {
  if (state.status !== 'betting' || !state.previousBet) return;
  if (state.previousBet > state.bankroll) return setBanner('Previous bet is too rich for current bankroll.');
  state.currentBet = state.previousBet;
  persistAndRender();
}

function ensureShoeBeforeRound() {
  if (state.shoe.length < 20) {
    state.shoe = shuffle(createDoubleDeck());
    state.needsShuffle = true;
    playShuffleAnimation();
  } else {
    state.needsShuffle = false;
  }
}

function startRound() {
  if (state.status !== 'betting') return;
  if (state.currentBet <= 0) return setBanner('Place a bet first.');
  if (state.currentBet > state.bankroll) return setBanner('Bet exceeds bankroll.');

  ensureShoeBeforeRound();
  state.status = 'initialDeal';
  state.bankroll -= state.currentBet;
  state.previousBet = state.currentBet;
  state.dealer = { cards: [] };
  state.playerHands = [createHand(state.currentBet)];
  state.activeHandIndex = 0;

  dealCardTo(state.playerHands[0]);
  dealCardTo(state.dealer);
  dealCardTo(state.playerHands[0]);
  dealCardTo(state.dealer);

  if (checkNaturals()) {
    settleRound();
  } else {
    state.status = 'playerTurn';
    setBanner('Player turn. Choose your move.');
  }
  persistAndRender();
}

function dealCardTo(target) {
  target.cards.push(drawCard());
  playTone(260, 0.03, 'square');
}

function checkNaturals() {
  const player = state.playerHands[0];
  const dealer = { cards: state.dealer.cards };
  if (isNaturalBlackjack(player) || isNaturalBlackjack(dealer)) {
    state.status = 'dealerTurn';
    return true;
  }
  return false;
}

function playerAction(action) {
  if (state.status !== 'playerTurn') return;
  const hand = state.playerHands[state.activeHandIndex];
  if (!hand || hand.isFinished) return;

  if (action === 'hit') {
    if (!canHit(hand)) return;
    dealCardTo(hand);
    if (evaluateHand(hand.cards).bust) {
      hand.isFinished = true;
      hand.result = 'bust';
      advanceTurn();
    }
  }

  if (action === 'stand') {
    hand.isFinished = true;
    advanceTurn();
  }

  if (action === 'double') {
    if (!canDouble(hand)) return;
    state.bankroll -= hand.bet;
    hand.bet *= 2;
    hand.hasDoubled = true;
    dealCardTo(hand);
    hand.isFinished = true;
    playTone(190, 0.07, 'sawtooth');
    if (evaluateHand(hand.cards).bust) hand.result = 'bust';
    advanceTurn();
  }

  if (action === 'split') {
    if (!canSplit(hand)) return;
    state.bankroll -= hand.bet;
    const [c1, c2] = hand.cards;
    const aceSplit = c1.rank === 'A' && c2.rank === 'A';
    const h1 = createHand(hand.bet);
    const h2 = createHand(hand.bet);
    h1.isSplitHand = h2.isSplitHand = true;
    h1.splitFromAces = h2.splitFromAces = aceSplit;
    h1.cards = [c1];
    h2.cards = [c2];
    dealCardTo(h1);
    dealCardTo(h2);
    if (aceSplit) {
      h1.isFinished = true;
      h2.isFinished = true;
    }
    state.playerHands.splice(state.activeHandIndex, 1, h1, h2);
    playTone(520, 0.05, 'triangle');
    if (aceSplit) {
      advanceTurn();
    }
  }

  persistAndRender();
}

function canHit(hand) {
  if (hand.hasDoubled || hand.isFinished) return false;
  if (hand.splitFromAces) return false;
  return true;
}

function canDouble(hand) {
  return hand.cards.length === 2 && !hand.hasDoubled && !hand.isFinished && state.bankroll >= hand.bet && !hand.splitFromAces;
}

function canSplit(hand) {
  if (hand.cards.length !== 2) return false;
  if (state.bankroll < hand.bet) return false;
  if (hand.splitFromAces) return false;
  return hand.cards[0].rank === hand.cards[1].rank;
}

function advanceTurn() {
  while (state.activeHandIndex < state.playerHands.length && state.playerHands[state.activeHandIndex].isFinished) {
    state.activeHandIndex++;
  }
  if (state.activeHandIndex >= state.playerHands.length) {
    state.status = 'dealerTurn';
    playDealer();
    settleRound();
  }
}

function playDealer() {
  const liveHands = state.playerHands.filter(h => !evaluateHand(h.cards).bust);
  if (!liveHands.length) return;
  while (true) {
    const ev = evaluateHand(state.dealer.cards);
    if (ev.total < 17) {
      dealCardTo(state.dealer);
      continue;
    }
    break;
  }
}

function settlementReturn(hand) {
  const player = evaluateHand(hand.cards);
  const dealer = evaluateHand(state.dealer.cards);
  const playerBJ = isNaturalBlackjack(hand);
  const dealerBJ = state.playerHands.length === 1 && isNaturalBlackjack({ cards: state.dealer.cards, isSplitHand: false });

  if (playerBJ || dealerBJ) {
    if (playerBJ && dealerBJ) return { result: 'push', bankrollDelta: hand.bet };
    if (playerBJ) return { result: 'blackjack', bankrollDelta: hand.bet * 2.5 };
    return { result: 'lose', bankrollDelta: 0 };
  }
  if (player.bust) return { result: 'bust', bankrollDelta: 0 };
  if (dealer.bust) return { result: 'win', bankrollDelta: hand.bet * 2 };
  if (player.total > dealer.total) return { result: 'win', bankrollDelta: hand.bet * 2 };
  if (player.total < dealer.total) return { result: 'lose', bankrollDelta: 0 };
  return { result: 'push', bankrollDelta: hand.bet };
}

function settleRound() {
  state.status = 'roundOver';
  const outcomes = [];
  let net = 0;
  for (const hand of state.playerHands) {
    const result = settlementReturn(hand);
    hand.result = result.result;
    hand.payout = result.bankrollDelta;
    state.bankroll += result.bankrollDelta;
    net += result.bankrollDelta - hand.bet;
    outcomes.push(result.result);
    if (result.result === 'blackjack') state.stats.blackjacks++;
    if (result.result === 'win' || result.result === 'blackjack') state.stats.handsWon++;
    else if (result.result === 'push') state.stats.handsPushed++;
    else state.stats.handsLost++;
  }
  state.stats.roundsPlayed++;
  state.lastRound = summarizeRound(outcomes, net);
  applyThresholds();
  state.currentBet = 0;
  if (!state.gameWon) state.status = 'betting';
  setBanner(state.lastRound);
  playResultSound(outcomes);
}

function summarizeRound(outcomes, net) {
  const summary = `${outcomes.map(o => o.toUpperCase()).join(' / ')} · ${net >= 0 ? '+' : '-'}$${Math.abs(net).toLocaleString()}`;
  return summary;
}

function applyThresholds() {
  if (state.bankroll < 1000) {
    state.bankroll = 50000;
    state.lastRound += ' · Bankroll reset to $50,000';
  }
  if (state.bankroll > 1000000) {
    state.gameWon = true;
    state.status = 'gameWon';
    state.lastRound += ' · You broke the house.';
  }
}

function render() {
  els.bankrollValue.textContent = money(state.bankroll);
  els.currentBetValue.textContent = money(state.currentBet);
  els.lastRoundText.textContent = state.lastRound || 'Place your first bet.';
  els.roundPhaseLabel.textContent = humanStatus(state.status);
  els.roundStateMobile.textContent = humanStatus(state.status);
  els.campaignState.textContent = state.gameWon ? 'Victory: The table is yours.' : state.bankroll > 900000 ? 'Closing in on a million.' : 'Starting stake: $50,000';
  const shoePct = Math.max(8, (state.shoe.length / 104) * 100);
  els.shoeFill.style.width = `${shoePct}%`;
  els.shoeCount.textContent = `${state.shoe.length} cards`;
  els.shoeCountMobile.textContent = `${state.shoe.length} cards`;
  renderDealer();
  renderPlayerHands();
  updateControls();
}

function renderDealer() {
  els.dealerHand.innerHTML = '';
  const hideHole = state.status === 'playerTurn' || state.status === 'initialDeal';
  state.dealer.cards.forEach((card, index) => {
    const node = createCardNode(card, hideHole && index === 1);
    els.dealerHand.appendChild(node);
  });
  if (!state.dealer.cards.length) {
    els.dealerHand.innerHTML = '<div class="table-message">Dealer is waiting.</div>';
  }
  els.dealerTotal.textContent = state.dealer.cards.length ? (hideHole ? cardLabel(state.dealer.cards[0]) + ' + ?' : evaluateHand(state.dealer.cards).total) : '--';
}

function renderPlayerHands() {
  els.playerHands.innerHTML = '';
  els.playerSummary.textContent = `${state.playerHands.length} hand${state.playerHands.length === 1 ? '' : 's'}`;
  state.playerHands.forEach((hand, index) => {
    const ev = evaluateHand(hand.cards);
    const wrap = document.createElement('article');
    wrap.className = `player-hand ${index === state.activeHandIndex && state.status === 'playerTurn' ? 'active' : ''}`;
    wrap.innerHTML = `
      <div class="hand-header">
        <div>
          <span class="label">Hand ${index + 1}</span>
          <strong>${money(hand.bet)} · ${ev.total}${ev.soft ? ' soft' : ''}</strong>
        </div>
        ${hand.result ? `<span class="result-tag ${hand.result}">${hand.result}</span>` : ''}
      </div>
      <div class="hand-cards"></div>
    `;
    const cardsEl = wrap.querySelector('.hand-cards');
    hand.cards.forEach(card => cardsEl.appendChild(createCardNode(card, false)));
    els.playerHands.appendChild(wrap);
  });
  if (!state.playerHands.length) {
    els.playerHands.innerHTML = '<div class="table-message">No cards on the felt yet.</div>';
  }
}

function createCardNode(card, faceDown) {
  const node = document.createElement('div');
  node.className = `card ${faceDown ? 'face-down' : ''}`;
  if (faceDown) return node;
  const suitMap = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const red = card.suit === 'H' || card.suit === 'D';
  node.classList.toggle('red', red);
  node.innerHTML = `
    <div class="card-inner">
      <div>
        <div class="card-value">${card.rank}</div>
        <div class="card-suit">${suitMap[card.suit]}</div>
      </div>
      <div class="card center-mark ${red ? 'red' : ''}">${suitMap[card.suit]}</div>
      <div style="transform: rotate(180deg); align-self: flex-end; text-align: right;">
        <div class="card-value">${card.rank}</div>
        <div class="card-suit">${suitMap[card.suit]}</div>
      </div>
    </div>
  `;
  return node;
}

function updateControls() {
  const active = state.playerHands[state.activeHandIndex];
  const betting = state.status === 'betting' && !state.gameWon;
  [...els.chipRow.querySelectorAll('[data-chip]')].forEach(btn => btn.disabled = !betting);
  els.dealBtn.disabled = !betting || state.currentBet <= 0;
  els.clearBetBtn.disabled = !betting || state.currentBet <= 0;
  els.rebetBtn.disabled = !betting || !state.previousBet;
  els.hitBtn.disabled = !(state.status === 'playerTurn' && active && canHit(active));
  els.standBtn.disabled = !(state.status === 'playerTurn' && active && !active.isFinished);
  els.doubleBtn.disabled = !(state.status === 'playerTurn' && active && canDouble(active));
  els.splitBtn.disabled = !(state.status === 'playerTurn' && active && canSplit(active));
}

function setBanner(text) {
  els.statusBanner.textContent = text;
  els.tableMessage.textContent = text;
}

function humanStatus(status) {
  return ({ betting: 'Betting', initialDeal: 'Dealing', playerTurn: 'Player Turn', dealerTurn: 'Dealer Turn', roundOver: 'Round Over', gameWon: 'Victory' })[status] || status;
}

function money(n) { return `$${Math.round(n).toLocaleString()}`; }
function cardLabel(card) { return `${card.rank}${card.suit}`; }

function persistAndRender() {
  saveGame();
  render();
}

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function toggleSound() {
  audioEnabled = !audioEnabled;
  els.soundToggle.textContent = `Sound: ${audioEnabled ? 'On' : 'Off'}`;
}

function ensureAudio() {
  if (!audioEnabled) return null;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine') {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function playResultSound(outcomes) {
  if (outcomes.includes('blackjack')) {
    playTone(660, 0.08, 'triangle');
    setTimeout(() => playTone(880, 0.12, 'triangle'), 80);
  } else if (outcomes.includes('win')) {
    playTone(520, 0.08, 'triangle');
  } else if (outcomes.every(o => o === 'lose' || o === 'bust')) {
    playTone(140, 0.12, 'sawtooth');
  } else {
    playTone(300, 0.06, 'square');
  }
}

function playShuffleAnimation() {
  els.shoeStack.classList.add('shoe-shuffling');
  setBanner('Shuffling the shoe...');
  playTone(220, 0.08, 'sawtooth');
  setTimeout(() => playTone(180, 0.08, 'sawtooth'), 120);
  setTimeout(() => playTone(250, 0.08, 'sawtooth'), 240);
  setTimeout(() => els.shoeStack.classList.remove('shoe-shuffling'), 1600);
}

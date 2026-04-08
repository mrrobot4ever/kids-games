const STORAGE_KEY = 'blackjack-blowout-save-v1';
const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CHIP_VALUES = [1000, 2500, 5000];

const els = {
  bankrollValue: document.getElementById('bankrollValue'),
  bankrollDelta: document.getElementById('bankrollDelta'),
  currentBetValue: document.getElementById('currentBetValue'),
  motionRibbon: document.getElementById('motionRibbon'),
  dealerTotal: document.getElementById('dealerTotal'),
  playerSummary: document.getElementById('playerSummary'),
  statusBanner: document.getElementById('statusBanner'),
  tableMessage: document.getElementById('tableMessage'),
  campaignState: document.getElementById('campaignState'),
  dealerHand: document.getElementById('dealerHand'),
  playerHands: document.getElementById('playerHands'),
  playerHandTabs: document.getElementById('playerHandTabs'),
  shoeCountMobile: document.getElementById('shoeCountMobile'),
  shoeStack: document.getElementById('shoeStack'),
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
  betModeBtn: document.getElementById('betModeBtn'),
  playModeBtn: document.getElementById('playModeBtn'),
  betPanel: document.getElementById('betPanel'),
  playPanel: document.getElementById('playPanel'),
  betCircle: document.getElementById('betCircle'),
  tableSurface: document.getElementById('tableSurface'),
};

let audioEnabled = true;
let sfxReady = false;
const sfx = {};
let state = loadGame() || makeFreshState();
coerceState(state);
render();
window.addEventListener('pointerdown', () => initSfx(), { once: true, passive: true });

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
els.betModeBtn.addEventListener('click', () => setControlMode('bet'));
els.playModeBtn.addEventListener('click', () => setControlMode('play'));

function makeFreshState() {
  return { bankroll: 50000, status: 'betting', shoe: shuffle(createDoubleDeck()), dealer: { cards: [] }, playerHands: [], activeHandIndex: 0, currentBet: 0, previousBet: 0, lastRound: null, stats: { roundsPlayed: 0, handsWon: 0, handsLost: 0, handsPushed: 0, blackjacks: 0 }, needsShuffle: false, gameWon: false };
}
function coerceState(s) {
  if (!s.shoe || !Array.isArray(s.shoe) || !s.shoe.length) s.shoe = shuffle(createDoubleDeck());
  if (!s.dealer) s.dealer = { cards: [] };
  if (!Array.isArray(s.playerHands)) s.playerHands = [];
  if (!s.stats) s.stats = { roundsPlayed: 0, handsWon: 0, handsLost: 0, handsPushed: 0, blackjacks: 0 };
  if (typeof s.bankroll !== 'number' || Number.isNaN(s.bankroll)) s.bankroll = 50000;
  if (typeof s.currentBet !== 'number') s.currentBet = 0;
}
function createDoubleDeck() { const deck = []; for (let d = 0; d < 2; d++) for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit }); return deck; }
function shuffle(cards) { const a = [...cards]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function drawCard() { if (state.shoe.length === 0) state.shoe = shuffle(createDoubleDeck()); return state.shoe.pop(); }
function evaluateHand(cards) { let total = 0, aceCount = 0; for (const card of cards) { if (card.rank === 'A') { total += 11; aceCount++; } else if (['K','Q','J'].includes(card.rank)) total += 10; else total += Number(card.rank); } let acesAsEleven = aceCount; while (total > 21 && acesAsEleven > 0) { total -= 10; acesAsEleven--; } return { total, soft: acesAsEleven > 0, blackjack: cards.length === 2 && total === 21, bust: total > 21 }; }
function isNaturalBlackjack(hand) { return evaluateHand(hand.cards).blackjack && !hand.isSplitHand; }
function createHand(bet) { return { cards: [], bet, isFinished: false, hasDoubled: false, isSplitHand: false, splitFromAces: false, result: null, payout: 0 }; }

function addChip(value) {
  if (state.status !== 'betting') return;
  if (!CHIP_VALUES.includes(value)) return;
  if (state.currentBet + value > state.bankroll) return setBanner('Not enough chips for that bet.');
  state.currentBet += value;
  playSfx('chip-click');
  pulseBetCircle();
  showMotionRibbon('Chip placed');
  if (state.currentBet % 1000 === 0) setBanner(`Bet set: ${money(state.currentBet)}`);
  persistAndRender();
}
function clearBet() { if (state.status !== 'betting') return; state.currentBet = 0; playSfx('loss'); showMotionRibbon('Bet cleared'); setBanner('Bet cleared.'); persistAndRender(); }
function rebet() { if (state.status !== 'betting' || !state.previousBet) return; if (state.previousBet > state.bankroll) return setBanner('Previous stake is too rich.'); state.currentBet = state.previousBet; playSfx('chip-click'); pulseBetCircle(); showMotionRibbon('Rebet'); setBanner('Previous stake restored.'); persistAndRender(); }

function ensureShoeBeforeRound() { if (state.shoe.length < 20) { state.shoe = shuffle(createDoubleDeck()); state.needsShuffle = true; playShuffleAnimation(); } else state.needsShuffle = false; }
function startRound() { if (state.status !== 'betting') return; if (state.currentBet <= 0) return setBanner('Place your wager.'); if (state.currentBet > state.bankroll) return setBanner('Bet exceeds bankroll.'); ensureShoeBeforeRound(); state.status = 'initialDeal'; state.bankroll -= state.currentBet; showBankrollDelta(-state.currentBet, 'negative'); state.previousBet = state.currentBet; state.dealer = { cards: [] }; state.playerHands = [createHand(state.currentBet)]; state.activeHandIndex = 0; dealCardTo(state.playerHands[0],0); dealCardTo(state.dealer,0); dealCardTo(state.playerHands[0],1); dealCardTo(state.dealer,1); if (checkNaturals()) { settleRound(); } else { state.status = 'playerTurn'; showMotionRibbon('Opening deal'); setBanner('Your move.'); } persistAndRender(); }
function dealCardTo(target,index=0) { target.cards.push(drawCard()); playSfx('card-slide', 0.96 + Math.random()*0.08); }
function checkNaturals() { const player = state.playerHands[0]; const dealer = { cards: state.dealer.cards, isSplitHand: false }; if (isNaturalBlackjack(player) || isNaturalBlackjack(dealer)) { state.status = 'dealerTurn'; return true; } return false; }

function playerAction(action) {
  if (state.status !== 'playerTurn') return;
  const hand = state.playerHands[state.activeHandIndex];
  if (!hand || hand.isFinished) return;
  if (action === 'hit') {
    if (!canHit(hand)) return;
    dealCardTo(hand);
    showMotionRibbon('Hit');
    const ev = evaluateHand(hand.cards);
    if (ev.bust) { hand.isFinished = true; hand.result = 'bust'; setBanner('Too much heat.'); advanceTurn(); }
    else if (ev.total >= 17) setBanner(`${ev.total}. Strong spot.`); else setBanner(`${ev.total}. Still clean.`);
  }
  if (action === 'stand') { hand.isFinished = true; playSfx('push'); showMotionRibbon('Stand'); setBanner(`Stand on ${evaluateHand(hand.cards).total}.`); advanceTurn(); }
  if (action === 'double') { if (!canDouble(hand)) return; state.bankroll -= hand.bet; showBankrollDelta(-hand.bet, 'negative'); hand.bet *= 2; hand.hasDoubled = true; playSfx('chip-click', 0.9); showMotionRibbon('Double down'); dealCardTo(hand); hand.isFinished = true; if (evaluateHand(hand.cards).bust) hand.result = 'bust'; setBanner('Pressed the edge.'); advanceTurn(); }
  if (action === 'split') { if (!canSplit(hand)) return; state.bankroll -= hand.bet; showBankrollDelta(-hand.bet, 'negative'); const [c1, c2] = hand.cards; const aceSplit = c1.rank === 'A' && c2.rank === 'A'; const h1 = createHand(hand.bet), h2 = createHand(hand.bet); h1.isSplitHand = h2.isSplitHand = true; h1.splitFromAces = h2.splitFromAces = aceSplit; h1.cards=[c1]; h2.cards=[c2]; dealCardTo(h1); dealCardTo(h2); if (aceSplit) { h1.isFinished=true; h2.isFinished=true; } state.playerHands.splice(state.activeHandIndex,1,h1,h2); playSfx('chip-click',1.08); showMotionRibbon('Split hand'); setBanner(aceSplit ? 'Split aces. One card each.' : 'Split live. Play both lines.'); if (aceSplit) advanceTurn(); }
  persistAndRender();
}
function canHit(hand) { return !hand.hasDoubled && !hand.isFinished && !hand.splitFromAces; }
function canDouble(hand) { return hand.cards.length === 2 && !hand.hasDoubled && !hand.isFinished && state.bankroll >= hand.bet && !hand.splitFromAces; }
function canSplit(hand) { return hand.cards.length === 2 && state.bankroll >= hand.bet && !hand.splitFromAces && hand.cards[0].rank === hand.cards[1].rank; }
function advanceTurn() { while (state.activeHandIndex < state.playerHands.length && state.playerHands[state.activeHandIndex].isFinished) state.activeHandIndex++; if (state.activeHandIndex >= state.playerHands.length) { state.status = 'dealerTurn'; playDealer(); settleRound(); } }
function playDealer() { const liveHands = state.playerHands.filter(h => !evaluateHand(h.cards).bust); if (!liveHands.length) return; setBanner('Dealer plays out.'); playSfx('card-flip'); showMotionRibbon('Dealer reveals'); while (true) { const ev = evaluateHand(state.dealer.cards); if (ev.total < 17) { dealCardTo(state.dealer); continue; } break; } }
function settlementReturn(hand) { const player = evaluateHand(hand.cards), dealer = evaluateHand(state.dealer.cards); const playerBJ = isNaturalBlackjack(hand); const dealerBJ = state.playerHands.length === 1 && isNaturalBlackjack({ cards: state.dealer.cards, isSplitHand: false }); if (playerBJ || dealerBJ) { if (playerBJ && dealerBJ) return { result: 'push', bankrollDelta: hand.bet }; if (playerBJ) return { result: 'blackjack', bankrollDelta: hand.bet * 2.5 }; return { result: 'lose', bankrollDelta: 0 }; } if (player.bust) return { result: 'bust', bankrollDelta: 0 }; if (dealer.bust) return { result: 'win', bankrollDelta: hand.bet * 2 }; if (player.total > dealer.total) return { result: 'win', bankrollDelta: hand.bet * 2 }; if (player.total < dealer.total) return { result: 'lose', bankrollDelta: 0 }; return { result: 'push', bankrollDelta: hand.bet }; }
function settleRound() { state.status='roundOver'; const bankrollBefore=state.bankroll; const outcomes=[]; let net=0; for (const hand of state.playerHands) { const result=settlementReturn(hand); hand.result=result.result; hand.payout=result.bankrollDelta; state.bankroll += result.bankrollDelta; net += result.bankrollDelta - hand.bet; outcomes.push(result.result); if (result.result === 'blackjack') state.stats.blackjacks++; if (result.result === 'win' || result.result === 'blackjack') state.stats.handsWon++; else if (result.result === 'push') state.stats.handsPushed++; else state.stats.handsLost++; } state.stats.roundsPlayed++; state.lastRound=summarizeRound(outcomes, net); if (state.bankroll !== bankrollBefore) showBankrollDelta(state.bankroll - bankrollBefore, state.bankroll >= bankrollBefore ? 'positive':'negative'); applyThresholds(); state.currentBet = 0; if (!state.gameWon) state.status='betting'; setBanner(statusCopyFromOutcomes(outcomes)); playResultSound(outcomes); }
function summarizeRound(outcomes, net) { return `${outcomes.map(o=>o.toUpperCase()).join(' / ')} · ${net >= 0 ? '+' : '-'}$${Math.abs(net).toLocaleString()}`; }
function applyThresholds() { if (state.bankroll < 1000) { state.bankroll = 50000; state.lastRound += ' · Bankroll reset to $50,000'; } if (state.bankroll > 1000000) { state.gameWon = true; state.status = 'gameWon'; state.lastRound += ' · The table is yours.'; } }

function render() { els.bankrollValue.textContent = money(state.bankroll); els.currentBetValue.textContent = money(state.currentBet); els.roundPhaseLabel.textContent = humanStatus(state.status); els.campaignState.textContent = state.gameWon ? 'Victory' : state.bankroll > 900000 ? 'Near $1M' : 'Target $1M'; els.shoeCountMobile.textContent = `${state.shoe.length}`; renderDealer(); renderPlayerHands(); updateControls(); syncControlMode(); }
function renderDealer() { els.dealerHand.innerHTML=''; const hideHole = state.status === 'playerTurn' || state.status === 'initialDeal'; state.dealer.cards.forEach((card,index)=>{ const node = createCardNode(card, hideHole && index===1); node.classList.add('dealing'); node.style.animationDelay = `${index*90}ms`; if (!hideHole && index===1) node.classList.add('revealing'); els.dealerHand.appendChild(node); }); if (!state.dealer.cards.length) els.dealerHand.innerHTML='<div class="status-toast">Dealer is waiting.</div>'; els.dealerTotal.textContent = state.dealer.cards.length ? (hideHole ? cardLabel(state.dealer.cards[0]) + ' + ?' : evaluateHand(state.dealer.cards).total) : '--'; }
function renderPlayerHands() { els.playerHands.innerHTML=''; els.playerHandTabs.innerHTML=''; els.playerSummary.textContent=`${state.playerHands.length} hand${state.playerHands.length===1?'':'s'}`; if (!state.playerHands.length) { els.playerHands.innerHTML='<div class="status-toast">No cards on the felt yet.</div>'; return; } const activeIndex=Math.min(state.activeHandIndex, Math.max(0, state.playerHands.length-1)); state.playerHands.forEach((hand,index)=>{ const ev=evaluateHand(hand.cards); const tab=document.createElement('button'); tab.className=`hand-tab ${index===activeIndex?'active':''}`; tab.textContent=`H${index+1} · ${ev.total}`; tab.type='button'; tab.addEventListener('click', ()=>{ state.activeHandIndex=index; render(); }); els.playerHandTabs.appendChild(tab); }); const hand=state.playerHands[activeIndex]; const ev=evaluateHand(hand.cards); const wrap=document.createElement('article'); wrap.className=`player-hand ${state.status==='playerTurn'?'active':''} ${hand.result||''}`; wrap.innerHTML=`<div class="hand-header"><div><span class="label">Hand ${activeIndex+1}</span><strong>${money(hand.bet)} · ${ev.total}${ev.soft ? ' soft' : ''}</strong></div>${hand.result ? `<span class="result-tag ${hand.result}">${hand.result}</span>` : ''}</div><div class="hand-cards"></div>`; const cardsEl=wrap.querySelector('.hand-cards'); hand.cards.forEach((card,index)=>{ const n=createCardNode(card,false); n.classList.add('dealing'); n.style.animationDelay=`${index*90}ms`; cardsEl.appendChild(n); }); els.playerHands.appendChild(wrap); fitCards(cardsEl); }
function createCardNode(card, faceDown) { const node=document.createElement('div'); node.className=`card ${faceDown?'face-down':''}`; if (faceDown) return node; const suitMap={S:'♠',H:'♥',D:'♦',C:'♣'}; const red=card.suit==='H'||card.suit==='D'; node.classList.toggle('red', red); node.innerHTML=`<div class="card-inner"><div><div class="card-value">${card.rank}</div><div class="card-suit">${suitMap[card.suit]}</div></div><div class="card center-mark ${red?'red':''}">${suitMap[card.suit]}</div><div style="transform: rotate(180deg); align-self: flex-end; text-align: right;"><div class="card-value">${card.rank}</div><div class="card-suit">${suitMap[card.suit]}</div></div></div>`; return node; }
function updateControls() { const active = state.playerHands[state.activeHandIndex]; const betting = state.status==='betting' && !state.gameWon; [...els.chipRow.querySelectorAll('[data-chip]')].forEach(btn => btn.disabled = !betting); els.dealBtn.disabled = !betting || state.currentBet <= 0; els.clearBetBtn.disabled = !betting || state.currentBet <= 0; els.rebetBtn.disabled = !betting || !state.previousBet; els.hitBtn.disabled = !(state.status==='playerTurn' && active && canHit(active)); els.standBtn.disabled = !(state.status==='playerTurn' && active && !active.isFinished); els.doubleBtn.disabled = !(state.status==='playerTurn' && active && canDouble(active)); els.splitBtn.disabled = !(state.status==='playerTurn' && active && canSplit(active)); }
function setControlMode(mode) { const betActive = mode==='bet'; els.betModeBtn.classList.toggle('active', betActive); els.playModeBtn.classList.toggle('active', !betActive); els.betPanel.classList.toggle('active', betActive); els.playPanel.classList.toggle('active', !betActive); }
function syncControlMode() { setControlMode(state.status==='playerTurn' ? 'play':'bet'); }
function fitCards(container) { const cards=[...container.children]; if (!cards.length) return; container.style.transform=''; const first=cards[0], width=first.getBoundingClientRect().width; const overlap=Math.abs(parseFloat(getComputedStyle(first).marginLeft))||10; const needed=width + Math.max(0, cards.length-1)*Math.max(8, width-overlap); const max=container.clientWidth-6; if (needed>max && max>0) container.style.transform=`scale(${Math.max(0.72, max/needed)})`; }
function pulseBetCircle() { els.betCircle.classList.remove('pulse'); void els.betCircle.offsetWidth; els.betCircle.classList.add('pulse'); }
function showBankrollDelta(amount, tone) { if (!amount) return; els.bankrollDelta.textContent=`${amount>0?'+':'-'}${money(Math.abs(amount))}`; els.bankrollDelta.className=`bankroll-delta ${tone} show`; setTimeout(()=>{ els.bankrollDelta.className='bankroll-delta'; },900); }
function spawnFloatDelta(text, tone='positive') { const el=document.createElement('div'); el.className=`float-delta ${tone} show`; el.textContent=text; els.betCircle.appendChild(el); setTimeout(()=>el.remove(),1000); }
function showMotionRibbon(text) { els.motionRibbon.textContent = text; els.motionRibbon.classList.remove('show'); void els.motionRibbon.offsetWidth; els.motionRibbon.classList.add('show'); }
function statusCopyFromOutcomes(outcomes) { if (state.gameWon) return 'The table is yours.'; if (outcomes.includes('blackjack')) return 'Blackjack. Premium paid.'; if (outcomes.includes('win')) return 'Dealer pays.'; if (outcomes.every(o=>o==='push')) return 'Push. Chips hold.'; if (outcomes.every(o=>o==='lose' || o==='bust')) return 'House takes it.'; return state.lastRound; }
function setBanner(text) { els.statusBanner.textContent=text; els.tableMessage.textContent=text; }
function humanStatus(status) { return ({ betting:'Betting', initialDeal:'Dealing', playerTurn:'Your Move', dealerTurn:'Dealer', roundOver:'Round Over', gameWon:'Victory' })[status] || status; }
function money(n) { return `$${Math.round(n).toLocaleString()}`; }
function cardLabel(card) { return `${card.rank}${card.suit}`; }
function persistAndRender() { saveGame(); render(); }
function saveGame() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadGame() { try { const raw=localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function toggleSound() { audioEnabled=!audioEnabled; els.soundToggle.textContent=`Sound ${audioEnabled?'On':'Off'}`; if (audioEnabled) initSfx(); }
function initSfx() { if (!audioEnabled || sfxReady) return; ['chip-click','card-slide','card-flip','shuffle','win','blackjack','loss','push','victory'].forEach(name=>{ const a=new Audio(`./assets/audio/${name}.ogg`); a.preload='auto'; sfx[name]=a; }); sfxReady=true; }
function playSfx(name, rate=1) { if (!audioEnabled) return; if (!sfxReady) initSfx(); const base=sfx[name]; if (!base) return; const a=base.cloneNode(); a.volume=0.65; a.playbackRate=rate; a.play().catch(()=>{}); }
function playResultSound(outcomes) { if (state.gameWon) { playSfx('victory'); spawnFloatDelta('VICTORY','positive'); showMotionRibbon('House broken'); return; } if (outcomes.includes('blackjack')) { playSfx('blackjack'); spawnFloatDelta('BLACKJACK','positive'); showMotionRibbon('Blackjack'); } else if (outcomes.includes('win')) { playSfx('win'); spawnFloatDelta('PAID','positive'); showMotionRibbon('Dealer pays'); } else if (outcomes.every(o=>o==='push')) { playSfx('push'); spawnFloatDelta('PUSH','neutral'); showMotionRibbon('Push'); } else if (outcomes.every(o=>o==='lose' || o==='bust')) { playSfx('loss'); spawnFloatDelta('HOUSE','negative'); showMotionRibbon('House takes it'); } }
function playShuffleAnimation() { els.shoeStack.classList.add('shoe-shuffling-premium'); els.tableSurface.classList.add('is-ceremony'); els.statusBanner.classList.add('is-shuffle'); setBanner('Fresh shoe. New fortunes.'); showMotionRibbon('Shuffling the shoe'); playSfx('shuffle'); setTimeout(()=>{ els.shoeStack.classList.remove('shoe-shuffling-premium'); els.tableSurface.classList.remove('is-ceremony'); els.statusBanner.classList.remove('is-shuffle'); },900); }

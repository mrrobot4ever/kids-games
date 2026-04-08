# Blackjack Blowout SFX Pack

Generated locally for mobile-safe web playback.

## Recommended loading strategy
- Primary: `.ogg`
- Fallback: `.wav`
- Keep sounds preloaded lazily after first user gesture.
- Use one shared `AudioContext` only if you need gain/master mute; otherwise plain `<audio>` works fine.

## Event mapping
- `chip-click` — chip placed on bet
- `card-slide` — deal card to player/dealer
- `card-flip` — reveal dealer hole card or dramatic card turn
- `shuffle` — reshuffle shoe
- `win` — normal winning hand
- `blackjack` — natural blackjack payout
- `loss` — losing round / bust cluster
- `push` — tie round
- `victory` — bankroll exceeds goal / game won

## Files
- `chip-click.ogg`, `chip-click.wav`
- `card-slide.ogg`, `card-slide.wav`
- `card-flip.ogg`, `card-flip.wav`
- `shuffle.ogg`, `shuffle.wav`
- `win.ogg`, `win.wav`
- `blackjack.ogg`, `blackjack.wav`
- `loss.ogg`, `loss.wav`
- `push.ogg`, `push.wav`
- `victory.ogg`, `victory.wav`

## Notes
These are deliberately short and dry. That is the right tradeoff for phone speakers, repeated playback, and tiny asset sizes.

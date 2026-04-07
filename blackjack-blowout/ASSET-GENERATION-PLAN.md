# Blackjack Blowout Asset Generation Plan

## Objective
Deliver the smallest high-value asset set for a responsive upscale blackjack game in under 30 minutes.

## Visual Direction
- Theme: upscale Monte Carlo private casino
- Core palette: midnight blue felt, brushed gold trim, ivory highlights, dark black marble
- Tone: expensive, moody, cinematic, restrained
- Avoid: cartoon styling, busy scenes, readable microtext, cluttered tables, cheesy Vegas neon

## Fastest 30-Minute Execution Strategy
1. Generate only 5 assets that move the visual quality the most.
2. Use Gemini Nano Banana 2 first because it is already configured and working locally.
3. Generate landscape key art for hero/background surfaces and one centered card-back product shot.
4. Do not chase full card faces, character art, or dozens of chip variants on first pass.
5. If time remains, crop/extract UI elements from the chip/card images in the game build.

## Asset Priority
1. Logo plate
2. Table hero background
3. Chip set
4. Premium card back
5. Ambient marble lounge background

## Exact Prompts

### 1) Logo plate
Create a premium game logo plate for a luxury online blackjack game titled BLACKJACK BLOWOUT. Ultra upscale Monte Carlo casino aesthetic. Centered art deco wordmark, brushed gold metallic letters, subtle engraved shadows, elegant ivory highlights, dark midnight blue enamel backing, gold filigree trim, small diamond spark accents, black marble and blue velvet luxury materials, dramatic studio lighting, clean composition, no extra text, no watermark, high-end UI-ready key art. Landscape composition, suitable for responsive web hero banner.

### 2) Table hero background
Create a luxury blackjack table hero background for a responsive web game. Top-down three-quarter view of a midnight blue felt blackjack table with refined gold trim and betting circles, dark Nero Marquina marble surround, subtle warm reflections, Monte Carlo private casino vibe, ultra premium materials, cinematic moody lighting, symmetrical composition, empty table ready for UI overlay, no cards in play, no chips clutter, no text, no watermark. Landscape composition with generous negative space for interface panels.

### 3) Chip set
Create a premium casino chip product shot asset set for a luxury blackjack game. Small arrangement of ultra high-end blackjack chips stacked and slightly scattered on midnight blue felt. Deep navy, ivory, black, and metallic gold chips with precise edge inlays, engraved denominations implied but not readable, luxury Monte Carlo casino styling, dramatic macro photography, crisp shadows, dark marble hints in the background, isolated composition with clean separation, no text, no watermark. Square-friendly composition suitable for extracting transparent UI elements.

### 4) Premium card back
Create a single luxury playing card back design for an upscale blackjack game. Straight-on centered card back, ornate symmetrical design, midnight blue base, brushed gold linework, subtle ivory micro-details, refined art deco geometry, elegant crest-like center motif, premium casino quality, crisp edges, perfect symmetry, clean neutral dark background, no text, no watermark, no perspective distortion. Designed to feel exclusive, custom, and expensive.

### 5) Ambient marble lounge background
Create an ambient luxury casino environment background for UI sections behind a blackjack game. Dark marble walls, midnight blue velvet panels, soft gold sconces, blurred elegant casino lounge atmosphere, subtle bokeh, refined Monte Carlo private club mood, rich blacks and blues, cinematic depth, uncluttered composition, no people, no readable signage, no text, no watermark. Landscape composition for secondary screens and menus.

## Files Generated
- `projects/blackjack-blowout/assets/generated/01-logo-plate.png`
- `projects/blackjack-blowout/assets/generated/02-table-hero-bg.png`
- `projects/blackjack-blowout/assets/generated/03-chip-set.png`
- `projects/blackjack-blowout/assets/generated/04-card-back.png`
- `projects/blackjack-blowout/assets/generated/05-ambient-marble-lounge-bg.png`

## Recommended Use In UI
- Logo plate: landing hero, splash screen, loading panel
- Table hero background: main gameplay background beneath betting UI
- Chip set: crop individual stacks for bet buttons, denomination selectors, chip tray art
- Card back: deck/back-of-card sprite and pre-deal animation art
- Ambient background: menus, settings, results, promo popups

## Fallback If Generation Is Slow
- Ship with only assets 1, 2, and 4 first. Those carry the whole luxury look.
- Use CSS for the rest:
  - felt: deep navy radial gradient with subtle noise
  - gold trim: linear gradients and inner shadows
  - marble: blurred dark stone texture or pure gradient placeholder
  - chips: use simple circular CSS tokens until extracted artwork is ready
- If one model stalls, switch to Imagen 4 for the single missing hero asset rather than regenerating everything.

## Practical Notes
- Nano Banana 2 is already configured in this workspace and worked for all 5 assets.
- Prior workspace note: Veo rate limits are tighter than Grok, but that matters for video, not this image batch.
- For this job, still images were the right call. Fast, enough quality, no wasted cycles.

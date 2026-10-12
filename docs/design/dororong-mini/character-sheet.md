# Dororong — character sheet for the mini HUD icons

Source of truth: the existing Dororong icons in `view/src/assets/icons/` (especially `experience.png`, `health.png`, `voice.png`).
Background research: `docs/plans/2026-10-12-dororong-research.ko.md` — Dororong ("Doro") is a fan-made meme character derived from Dorothy of *Goddess of Victory: NIKKE*, now owned and merchandised by SHIFT UP. There is no published official model sheet or colour code, so the traits below are what the existing icons and the official DORO figure consistently show.

## Must-have traits (every icon)
- **Hair**: soft pink (#F4A3C4 range) bob with messy, slightly spiky bangs; shoulder length.
- **Rose bun**: on one side (viewer's right in our icons) a bun shaped like a **spiral rose in the same pink as the hair** (not a red flower, no leaves), with a **purple ribbon** (two loops and short tails) just below it. One side only — never symmetric twin buns. Keep it visible in every icon.
- **Eyes**: big oval **lavender/violet** eyes with a thick dark outline and white highlights, straight brows, calm/deadpan look. The thick outline is **not glasses** — no frames, no bridge.
- **Mouth**: small cat mouth **":3" (ω shape)**, light pink blush on the cheeks.
- **Body**: a small **white round body with four short, rounded stubby legs** (no paws, claws, snout or animal ears), standing/crawling low. Head is much bigger than the body.

Working palette (not official colours): hair #F2A0C5, eyes #AC87D0, ribbon #8963A6, body #FFFFFF, outline #29212C.

## Style
- Clean anime chibi sticker: dark brown/black outline, soft cel shading, flat colours, white highlights.
- Matches the existing sticker-style icon (`experience.png`), **not** the framed rune tiles.
- Transparent background, no frame, no text, square, subject centred and filling ~85% of the canvas.

## Recognition priority at small sizes
1. Big pink head (hair mass dominates). 2. One-sided rose bun + purple ribbon. 3. Big violet eyes. 4. Tiny ω mouth. 5. White body with four stubby legs (only from ~24 px; at 20 px a head-only icon is fine).
Common mistakes: glasses, symmetric twin buns, a red rose, a generic human chibi, dog/cat anatomy, Skyrim gear covering the eyes, mouth or rose bun.

## Readability rules (icons display at 20–28 px in the compact HUD)
- One idea per icon: Dororong head (or head + body) plus **one** large, simple prop that carries the meaning.
- The prop is in the meaning colour (fire = orange-red, frost = icy blue, shock = violet, poison = green, disease = olive, magic = purple, gold = gold, health = red, magicka = blue, stamina = green).
- Thick outlines (≥ 6 px at 256 px), no tiny details, no thin lines, high contrast against dark and bright game backgrounds.
- Expressions may change with the meaning (determined for weapons, sleepy for indoor, shivering for frost, sweating for weight), but face proportions stay the same.

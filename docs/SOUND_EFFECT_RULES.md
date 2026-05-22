# Sound Effect Selection Rules

## Core Philosophy

- SE must prioritize gameplay readability over realism
- SE must communicate state changes instantly
- Short repetitive sounds are preferred over cinematic sounds
- Avoid fatigue during long autoplay sessions
- The player should identify important events without looking directly

---

# Metadata Usage

Always inspect SE metadata before selection.

Preferred metadata fields:

- category
- subcategory
- intensity
- sharpness
- weight
- brightness
- duration_ms
- loopable
- emotional_tone
- frequency_focus
- transient_strength
- rarity
- ui_priority
- gameplay_priority

Never select audio by filename alone when metadata exists.

---

# Global Selection Priorities

Priority order:

1. Gameplay clarity
2. Timing readability
3. Emotional impact
4. Mix compatibility
5. Variety
6. Realism

---

# Duration Rules

## UI Sounds

- 30ms - 180ms preferred
- Never exceed 250ms

## Combat Impact

- 80ms - 400ms preferred

## Ultimate / Legendary

- Up to 1200ms allowed

## Ambient

- Must be loopable
- Avoid strong transients

---

# Frequency Rules

## Important gameplay events

Must occupy mid/high frequencies.

Examples:
- crit
- level up
- item complete
- win streak
- economy threshold

## Background events

Must avoid masking important frequencies.

Avoid excessive:
- low mids
- long reverb
- stereo spread

---

# Layering Rules

Maximum simultaneous transient-heavy sounds:
- 3 for combat
- 2 for UI

Avoid:
- stacking identical attack sounds
- overlapping low-frequency impacts
- multiple long tails simultaneously

---

# Combat Rules

## Normal Attack

Use:
- light transient
- short decay
- low emotional intensity

Avoid:
- bass-heavy sounds
- cinematic tails

## Critical Hit

Must:
- be brighter than normal attacks
- include sharper transient
- increase perceived loudness

## Tank Attack

Prefer:
- lower frequency emphasis
- heavier transient
- muted highs

## Assassin Attack

Prefer:
- sharp attack
- high-frequency transient
- fast decay

## Magic Attack

Prefer:
- tonal texture
- stereo movement
- softer transient

Avoid:
- realistic weapon sounds

---

# Ability Rules

## Charge Phase

Should:
- increase tension gradually
- avoid immediate peak energy

## Cast Moment

Must:
- clearly separate from normal attacks
- interrupt auditory monotony

## Area Attacks

Prefer:
- wide stereo image
- layered transient + tail

## Legendary Skills

Allowed:
- long tail
- cinematic bass
- harmonic rise

Must remain readable in crowded fights.

---

# Economy / Shop Rules

## Gold Gain

Use:
- pleasant high-frequency tones
- short resonance
- positive emotional tone

## Purchase

Should:
- feel tactile
- confirm successful action

## Reroll

Prefer:
- mechanical texture
- medium-speed transient repetition

## Sell

Should:
- feel lighter than purchase

---

# Win / Loss Rules

## Victory

Should:
- resolve harmonic tension
- feel uplifting
- avoid excessive duration

## Defeat

Should:
- reduce energy
- avoid frustration amplification

Never use:
- harsh distortion
- extremely low bass drops

---

# UI Rules

## Hover

Minimal sound only.

## Confirm

Clear transient required.

## Error

Must be recognizable immediately.

Avoid:
- loud sounds
- long sounds
- comedic sounds

---

# Repetition Protection

Avoid repeating identical SE within:
- 120ms for UI
- 250ms for combat

Prefer alternate variants when available.

Use metadata:
- variant_group
- repetition_weight

---

# Rarity Rules

## Common Events

Use low-complexity audio.

## Rare Events

Allow:
- harmonic layers
- longer tails
- wider stereo

## Legendary Events

May temporarily dominate the mix.

---

# Mixing Rules

Combat SE must duck ambient layers.

UI sounds always override ambience.

Critical gameplay notifications override all non-critical audio.

---

# Loudness Rules

Avoid large loudness differences between:
- consecutive attacks
- repeated UI interactions

Legendary moments may exceed standard loudness temporarily.

---

# Emotional Tone Rules

Use:
- positive tones for rewards
- tense tones for danger
- neutral tones for repetitive gameplay

Avoid emotionally exhausting sounds.

---

# Performance Rules

Prefer:
- compressed assets
- short assets
- reusable layered assets

Avoid:
- unnecessarily large files
- excessive simultaneous playback

---

# Accessibility Rules

Important gameplay events must be distinguishable:
- without relying solely on pitch
- without relying solely on stereo position

Use:
- transient shape
- rhythm
- texture differences

---

# Selection Algorithm

When multiple candidates exist:
1. Choose best gameplay readability
2. Choose shortest acceptable duration
3. Choose least mix-conflicting option
4. Prefer unused recent variants
5. Prefer lower memory cost

---

# Forbidden Choices

Never use:
- meme sounds
- comedic sounds during competitive play
- ultra-realistic gore audio
- long cinematic tails in repeated combat
- harsh clipping
- excessively dynamic sounds
- distracting vocals

Never choose the most impressive sound repeatedly.
Prefer sustainable long-session listening.
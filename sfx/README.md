# Sound effects (real recordings, CC0)

From **SFX Kit** by Wyzowl — https://github.com/wyzowl/sfx-kit — CC0 1.0 (public domain), converted to mono MP3 (64 kbps).
`assemble.py` embeds every `sfx/<kind>.mp3`; the engine plays it for `AUDIO.hits` of that kind (some kinds are layered with the old synthesized sound).

| kind | source file |
|---|---|
| boom | booms-and-bass/boom-hit-strong |
| impact | impacts/impact-heavy-hard |
| whoosh | whooshes/whoosh-fast-medium |
| riser | risers-and-fallers/riser-2s-strong (ends at t + dur) |
| thunder | cinematic-hits/cinematic-thunder-big |
| splash | everyday-props/props-splash |
| explosion | cinematic-hits/cinematic-slam-massive (+ synth rumble) |
| ding | notifications/notification-success-ding-ding |
| stinger | cinematic-hits/cinematic-drum-big (+ synth chord in key) |
| pop | pops/pop-medium-out |
| alarm | time/time-alarm |
| coin | money/money-coin-drop |
| ticks | time/time-clock |
| drop | booms-and-bass/boom-drop-strong |
| door | mechanical/mechanical-latch-heavy |
| applause | celebration/celebration-applause-small |
| fireworks | celebration/celebration-fireworks |
| confetti | celebration/celebration-popper |

Add more: put `<kind>.mp3` here (CC0 only) and add the kind to `SMAP` in the engine.

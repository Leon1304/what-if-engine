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

**Animals, dinosaurs, vehicles (v2.16)** — CC0 from OpenGameArt.org or public domain / CC0 from Wikimedia Commons; trimmed to the loudest part, mono MP3 64 kbps:

| kind | source | licence |
|---|---|---|
| roar | Commons: Lion raring-sound1TamilNadu178.ogg | public domain |
| growl | OpenGameArt: bear-growls (bear_01) | CC0 |
| howl | Commons: Wolf howls.ogg | public domain |
| trumpet | Commons: Elephant voice - trumpeting.ogg | CC0 |
| neigh | Commons: Wiehern.ogg | public domain |
| song | Commons: Humpbackwhale2.ogg | CC0 |
| caw | OpenGameArt: crow-caw | CC0 |
| squawk | Commons: Gull 1.ogg | public domain |
| meow | OpenGameArt: meow | CC0 |
| bleat | OpenGameArt: sheep-baa | CC0 |
| bray | OpenGameArt: donkey-bray (starninjas) | CC0 |
| trex | OpenGameArt: t-rex-calls | CC0 |
| raptor | OpenGameArt: small-dino-raspy-calls | CC0 |
| monster | OpenGameArt: cc0-deep-monster-roar | CC0 |
| wingflap | OpenGameArt: dragon-flap | CC0 |
| heli | OpenGameArt: helicopter-sfx (loops for `dur`) | CC0 |
| sinking | OpenGameArt: ship-sinking (ship_destroyed) | CC0 |

**Guns, punch, heartbeat, fire and ambience loops (v3.45)** — CC0 from OpenGameArt.org and Wikimedia Commons; one-shots trimmed and peak-normalised (mono MP3 64 kbps),
beds cut to seamless 12–16 s loops (end crossfaded into the start, RMS-normalised, mono MP3 48 kbps). `amb-<kind>.mp3` plays for `AUDIO.amb` of that kind (`RAMB` in the engine).

| kind | source | licence |
|---|---|---|
| shot | OpenGameArt: gunshots (22 Pistol.wav, first shot) | CC0 |
| rifle | OpenGameArt: gunshots (22 Magnum.wav, first shot) | CC0 |
| punch | OpenGameArt: 37-hitspunches (hit.mp3, first hit) | CC0 |
| heartbeat | OpenGameArt: heartbeat-sounds (heartbeat_slow_0.wav) | CC0 |
| fire | OpenGameArt: fire-crackling (fire-1.wav) | CC0 |
| amb-rain | OpenGameArt: amb-rain-loop-1 | CC0 |
| amb-wind | Commons: Howling wind.ogg | CC0 |
| amb-ocean | Commons: Ocean Waves on a Tropical Beach.ogg | CC0 |
| amb-city | Commons: Sagetyrtle - citystreet3 (cc0) (freesound).mp3 | CC0 |
| amb-people | Commons: 360703 eguobyte large-crowd-medium-distance-stereo.wav | CC0 |
| amb-battle | Commons: Dragout - War sounds (cc0) (freesound).ogg | CC0 |
| amb-forest | OpenGameArt: forest-bird-sounds (fb.mp3) | CC0 |
| amb-mob | OpenGameArt: crowd-shoutingspeaking-ambience | CC0 |

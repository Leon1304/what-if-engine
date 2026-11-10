# Serien

Jede Folge einer Serie liegt hier, damit die nächste Folge in derselben Welt weitermacht:

    series/<serie>/ep<N>.story.js   Story (CFG, BEATS, CAM, STATS, END, AUDIO …)
    series/<serie>/ep<N>.scene.js   Szene (Welt, Figuren, Massen, Effekte)

`<serie>` ist der Serienname klein mit Bindestrichen, z. B. `zombie-farm`.
Der /whatif-Skill lädt für Folge N die Dateien von Folge N−1 und speichert Folge N nach dem Rendern hier.

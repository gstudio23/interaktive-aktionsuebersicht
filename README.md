# Interaktive Aktionsübersicht

Hier kann man die Aktionen des Community-Projekts durchsuchen und nach Punkten, Teamgröße, Status und Wirkungskreis filtern. Eine Aktion öffnet zunächst ihre Beschreibung und verlinkt dann zum Original in GitLab.

## Aufbau

`index.html` und `script.js` bilden die Übersicht. `aktion.html` und `aktion.js` zeigen die einzelnen Aktionen. Das Aussehen steht in `style.css`. Die Aktionsliste liegt in `data/actions.json`; `scripts/update.py` kann sie aus GitLab neu erstellen.

Das Logo stammt von der [Screendesign-Seite der TH Köln](https://th-koeln.github.io/mi-bachelor-screendesign/).

## Lokal ansehen

Im Projektordner `python3 -m http.server 8000` ausführen und `http://localhost:8000` öffnen. Das direkte Öffnen der HTML-Datei reicht nicht, weil die Aktionsliste separat geladen wird.

## Aktionsliste aktualisieren

Das Python-Skript lädt die aktuellen Issues aus GitLab und schreibt `data/actions.json` neu. Dafür braucht es einen GitLab-Zugangsschlüssel. Hier wird ein auf `micgn/community-game/community-game-core` begrenzter Fine-grained Token mit `Work Item: Read` verwendet. Ein klassischer Token mit `read_api` funktioniert ebenfalls, kann aber alle Projekte lesen, auf die das eigene Konto Zugriff hat. Der Schlüssel darf nicht in Projektdateien stehen.

```sh
export GITLAB_TOKEN='DEIN_TOKEN'
python3 scripts/update.py
unset GITLAB_TOKEN
```

## Veröffentlichung

GitHub Pages veröffentlicht die Seite über `.github/workflows/pages.yml`. Bei jedem Commit wird sie neu bereitgestellt. Außerdem lädt ein täglicher Lauf die aktuellen Aktionen aus GitLab, solange das Repository Secret `GITLAB_TOKEN` gültig ist. Ohne Schlüssel verwendet die Seite die gespeicherte `data/actions.json`. Der Schlüssel wird weder im Repository noch auf der Website veröffentlicht.

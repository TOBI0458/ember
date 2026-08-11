; Eigene Seiten für den Ember-Installer.
;
; ACHTUNG: Diese Datei ist UTF-8 mit BOM gespeichert. Daran erkennt NSIS, dass
; Umlaute Umlaute sind. Ohne BOM liest es sie als alte Windows-Codepage, und aus
; "wählst" wird "wÃ¤hlst". Beim Bearbeiten also nicht als reines ASCII sichern.
;
; Eingebunden über "nsis.include" in der package.json. Die Vorlage von
; electron-builder ruft customWelcomePage ganz am Anfang auf - vor der Auswahl
; des Zielordners und vor der Schlussseite. Deshalb stehen die Texte für die
; Schlussseite hier mit drin: sie müssen definiert sein, bevor die Seite weiter
; unten in assistedInstaller.nsh eingefügt wird.

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Willkommen bei Ember"
  !define MUI_WELCOMEPAGE_TEXT "Ember ist dein eigener kleiner Spiele-Store: installieren, starten, aktualisieren - alles an einer Stelle.$\r$\n$\r$\nAuf der nächsten Seite wählst du aus, wohin Ember installiert werden soll.$\r$\n$\r$\nDanach hält Ember sich selbst aktuell, und neue Spiele erscheinen von allein im Store. Du musst nie wieder eine Datei herunterladen."
  !insertmacro MUI_PAGE_WELCOME

  !define MUI_FINISHPAGE_TITLE "Ember ist fertig eingerichtet"
  !define MUI_FINISHPAGE_TEXT "Beim ersten Start holt sich Ember die Spieleliste. Ist der Store noch leer, wurde einfach noch nichts veröffentlicht - neue Spiele tauchen später von selbst auf."
  !define MUI_FINISHPAGE_RUN_TEXT "Ember jetzt starten"
!macroend

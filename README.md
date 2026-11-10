# TikTok Player

Una pagina web statica: incolli un link TikTok e il video si apre nel player ufficiale di TikTok, senza account.

Funziona su GitHub Pages, senza server. I link completi (`tiktok.com/@utente/video/…`) funzionano sempre. I link brevi (`vm.tiktok.com/…`) vengono risolti tramite l'oEmbed ufficiale di TikTok, quando il browser lo permette.

Puoi aprire direttamente un video con `?url=<link>`.

## Versione locale
Nella cartella `locale/` c'è la versione con un piccolo server Node, che risolve sempre anche i link brevi. Vedi `locale/LEGGIMI.md`.

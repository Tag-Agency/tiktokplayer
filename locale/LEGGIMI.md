# TikTok Player locale

Incolli un link TikTok (anche quelli brevi `vm.tiktok.com/...`) e il video parte nel player ufficiale di TikTok, senza account.

## Requisiti
Node.js 18 o superiore (`node -v` per controllare). Nessuna libreria da installare.

## Avvio
```
cd tiktok-player
node server.js
```
Poi apri http://localhost:3000 nel browser.

Puoi anche aprire direttamente un video: `http://localhost:3000/?url=https://vm.tiktok.com/ZN8P24Dbf/`

## Come funziona
- `server.js` segue i redirect del link breve fino all'URL completo e ne estrae l'ID del video (il browser da solo non può farlo per via di CORS).
- La pagina carica il player embed ufficiale `https://www.tiktok.com/player/v1/<id>`, che non richiede login.
- Il server ascolta solo su `127.0.0.1` e accetta solo link `tiktok.com`.

Per cambiare porta: `PORT=8080 node server.js`

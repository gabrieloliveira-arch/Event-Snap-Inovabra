# Fiscal Intelligence Talks — Foto do Evento 📸

Landing page mobile-first onde o participante envia uma foto e baixa com a moldura oficial do **Fiscal Intelligence Talks** (NFE.io × inovabra habitat). **100% no navegador** (Node.js + Canvas API): a foto nunca sai do dispositivo.

## Pré-requisitos
- [Node.js](https://nodejs.org) >= 14 (sem dependências externas — usa apenas módulos nativos)

## Rodar localmente

```bash
npm start
```

Abre em `http://localhost:8501`.

> Por que um servidor? Ao desenhar imagens locais num canvas e exportar via `toBlob`, abrir por `file://` "contamina" o canvas e bloqueia o download. O `server.js` é um servidor estático mínimo, sem dependências.

## Como funciona

1. Participante toca em **"Toque para enviar sua foto"** (câmera ou galeria).
2. O app detecta a orientação da foto e escolhe a moldura: **vertical** (retrato) ou **horizontal** (paisagem).
3. A foto é redimensionada em modo *cover* e recortada nos cantos arredondados da janela.
4. A moldura oficial é sobreposta e a imagem final é gerada em **PNG**.
5. Botão **"Baixar minha foto"** salva `foto-fiscal-intelligence-talks.png`.

Respeita a orientação **EXIF** das fotos de celular (`createImageBitmap` + `imageOrientation`).

## Assets

```
assets/
├── frame_vertical.png      # moldura retrato (1284×1935, janela transparente)
├── frame_horizontal.png    # moldura paisagem (1788×1521, janela transparente)
├── logo-gradient.png       # (opcional) logo NFE.io do header — fallback p/ texto se ausente
└── inovabra-badge.png      # (opcional) selo inovabra do header — fallback p/ texto se ausente
```

- As molduras são **PNG RGBA** com a **janela da foto transparente**.
- Os logos do **header** são opcionais: se os arquivos não existirem, o app mostra um wordmark em texto automaticamente. Para o visual completo, adicione `logo-gradient.png` e `inovabra-badge.png`.

## Configuração

No topo de `app.js`:

```js
const FORMATO_FIXO = "auto";   // "auto" | "vertical" | "horizontal"
const DOWNLOAD_NAME = "foto-fiscal-intelligence-talks.png";
// FRAMES[...].win = [x, y, largura, altura] e r = raio dos cantos da janela
```

Cores/identidade ficam nas variáveis CSS (`:root`) em `styles.css`. Fontes: **Inter** + **JetBrains Mono** (Google Fonts).

## Deploy (site estático)

Publique a raiz do projeto (`index.html`, `app.js`, `styles.css`, `assets/`) em qualquer hospedagem de estáticos (Netlify, Vercel, Cloudflare Pages, GitHub Pages, Azure Static Web Apps). Em hosts com runtime Node, `npm start` também serve.

> Conectividade no evento: as fontes vêm do Google Fonts (CDN). Para funcionar **offline**, é possível embutir as fontes localmente — peça que ajustamos.

## Estrutura de arquivos

```
event-snap/
├── index.html        # landing page (header, hero, upload, resultado, footer)
├── styles.css        # estilos (gradientes, badge, botões, mobile-first)
├── app.js            # composição Canvas + estados da UI
├── server.js         # servidor estático Node (zero dependências)
├── package.json
└── assets/
    ├── frame_vertical.png
    └── frame_horizontal.png
```

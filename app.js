"use strict";

/*
 * Fiscal Intelligence Talks — porte da landing page (DCLogic -> vanilla JS).
 * Compõe a foto enviada dentro da moldura oficial, 100% no navegador.
 */

// Molduras: coordenadas da janela [x, y, largura, altura] e raio dos cantos,
// medidas sobre o PNG real (1284×1935 e 1788×1521).
const FRAMES = {
  portrait: { src: "assets/frame_vertical.png", w: 1284, h: 1935, win: [60, 60, 1164, 1455], r: 18 },
  landscape: { src: "assets/frame_horizontal.png", w: 1788, h: 1521, win: [54, 54, 1680, 1122], r: 20 },
};

// "auto" escolhe pela orientação da foto; "vertical"/"horizontal" forçam uma moldura.
const FORMATO_FIXO = "auto";
// Cada download recebe um hash curto no final do nome para ser único — evita
// conflito/sobrescrita ao salvar várias fotos (ex.: iOS, que não pergunta).
const DOWNLOAD_BASE = "foto-fiscal-intelligence-talks";

// Hash curto alfanumérico (a-z0-9) usando crypto quando disponível.
function shortHash(len = 7) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const rng = (typeof crypto !== "undefined" && crypto.getRandomValues)
    ? () => {
        const bytes = new Uint8Array(len);
        crypto.getRandomValues(bytes);
        return bytes;
      }
    : () => {
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
        return bytes;
      };
  const bytes = rng();
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const els = {};
const frameImgs = {};
let resultUrl = null;
let resultFile = null; // File PNG composto (para Web Share no iOS)
let resultName = null; // nome com hash, reutilizado no download e no share

// iOS/iPadOS: o atributo download é pouco confiável; preferimos a Web Share API.
// iPadOS 13+ se apresenta como "Mac", por isso o segundo teste (touch).
function isIOS() {
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/* ------------------------------------------------------------------ */
/* Composição (Canvas)                                                 */
/* ------------------------------------------------------------------ */

function preloadFrames() {
  for (const key of Object.keys(FRAMES)) {
    const img = new Image();
    img.src = FRAMES[key].src;
    frameImgs[key] = img;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Carrega a foto respeitando a orientação EXIF (importante em celular).
async function loadPhoto(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (e) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    img._objUrl = url; // revogado após desenhar
    return img;
  }
}

async function compose(file) {
  showState("busy");
  try {
    const photo = await loadPhoto(file);
    const pw = photo.naturalWidth || photo.width;
    const ph = photo.naturalHeight || photo.height;

    const orient =
      FORMATO_FIXO === "vertical"
        ? "portrait"
        : FORMATO_FIXO === "horizontal"
          ? "landscape"
          : pw >= ph
            ? "landscape"
            : "portrait";

    const F = FRAMES[orient];
    const frameImg = frameImgs[orient];
    if (!frameImg.complete || frameImg.naturalWidth === 0) {
      await new Promise((res, rej) => {
        frameImg.onload = res;
        frameImg.onerror = () => rej(new Error("Falha ao carregar a moldura."));
      });
    }

    const cv = document.createElement("canvas");
    cv.width = F.w;
    cv.height = F.h;
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const [wx, wy, ww, wh] = F.win;
    const s = Math.max(ww / pw, wh / ph); // cover
    const dw = pw * s;
    const dh = ph * s;

    ctx.save();
    roundRect(ctx, wx, wy, ww, wh, F.r);
    ctx.clip();
    ctx.drawImage(photo, wx + (ww - dw) / 2, wy + (wh - dh) / 2, dw, dh);
    ctx.restore();

    ctx.drawImage(frameImg, 0, 0);

    const blob = await new Promise((res) => cv.toBlob(res, "image/png"));

    if (photo.close) photo.close();
    if (photo._objUrl) URL.revokeObjectURL(photo._objUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(blob);
    resultName = `${DOWNLOAD_BASE}-${shortHash()}.png`;
    resultFile = new File([blob], resultName, { type: "image/png" });

    showResult(resultUrl, orient);
  } catch (err) {
    console.error(err);
    showState("idle");
    alert("Não foi possível processar a imagem. Tente outra foto.");
  } finally {
    els.fileInput.value = "";
  }
}

/* ------------------------------------------------------------------ */
/* Estados da UI                                                       */
/* ------------------------------------------------------------------ */

function showState(state) {
  els.idle.hidden = state !== "idle";
  els.busy.hidden = state !== "busy";
  els.result.hidden = state !== "result";
}

function showResult(url, orient) {
  els.preview.src = url;
  els.downloadBtn.href = url;
  els.downloadBtn.download = resultName;
  els.appliedLabel.textContent =
    "Moldura " + (orient === "landscape" ? "horizontal" : "vertical") + " aplicada";
  showState("result");
}

function reset() {
  if (resultUrl) {
    URL.revokeObjectURL(resultUrl);
    resultUrl = null;
  }
  resultFile = null;
  resultName = null;
  showState("idle");
}

// No iOS, abre a folha de compartilhamento nativa (com "Salvar Imagem" /
// "Adicionar às Fotos") em vez de um download que o Safari costuma ignorar.
// Desktop/Android continuam no download direto via <a download>.
async function onDownloadClick(e) {
  if (!resultFile) return;
  const canShareFile =
    isIOS() && navigator.canShare && navigator.canShare({ files: [resultFile] });
  if (!canShareFile) return; // deixa o comportamento padrão do <a download>

  e.preventDefault();
  try {
    await navigator.share({
      files: [resultFile],
      title: "Fiscal Intelligence Talks",
      text: "Minha foto do Fiscal Intelligence Talks 📸",
    });
  } catch (err) {
    if (err && err.name === "AbortError") return; // usuário cancelou
    forceDownload(); // qualquer outra falha → cai para o download
  }
}

function forceDownload() {
  if (!resultUrl) return;
  const a = document.createElement("a");
  a.href = resultUrl;
  a.download = resultName || `${DOWNLOAD_BASE}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

function setupLogoFallback(imgId, textId) {
  const img = document.getElementById(imgId);
  const text = document.getElementById(textId);
  img.addEventListener("error", () => {
    img.hidden = true;
    text.hidden = false;
  });
}

function init() {
  for (const id of [
    "idle",
    "busy",
    "result",
    "dropzone",
    "fileInput",
    "preview",
    "appliedLabel",
    "downloadBtn",
    "resetBtn",
  ]) {
    els[id] = document.getElementById(id);
  }

  preloadFrames();

  els.fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) compose(file);
  });
  els.resetBtn.addEventListener("click", reset);
  els.downloadBtn.addEventListener("click", onDownloadClick);

  // Drag-and-drop (desktop)
  ["dragenter", "dragover"].forEach((evt) =>
    els.dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      els.dropzone.classList.add("drag");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    els.dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      els.dropzone.classList.remove("drag");
    })
  );
  els.dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && /^image\//.test(file.type)) compose(file);
  });

  setupLogoFallback("logoNfe", "logoNfeText");
  setupLogoFallback("logoInova", "logoInovaText");
}

document.addEventListener("DOMContentLoaded", init);

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
const DOWNLOAD_NAME = "foto-fiscal-intelligence-talks.png";

const els = {};
const frameImgs = {};
let resultUrl = null;

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
  els.downloadBtn.download = DOWNLOAD_NAME;
  els.appliedLabel.textContent =
    "Moldura " + (orient === "landscape" ? "horizontal" : "vertical") + " aplicada";
  showState("result");
}

function reset() {
  if (resultUrl) {
    URL.revokeObjectURL(resultUrl);
    resultUrl = null;
  }
  showState("idle");
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

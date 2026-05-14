// Browser-side rMQR (Rectangular Micro QR) generator using qrean WASM.
// Renders to an offscreen canvas and returns a PNG data URL.
let qreanPromise: Promise<any> | null = null;
async function getQrean() {
  if (!qreanPromise) {
    qreanPromise = import("qrean").then((m) => m.Qrean.create());
  }
  return qreanPromise;
}

export async function generateRmqrPngDataUrl(text: string, scale = 8): Promise<string> {
  const q = await getQrean();
  const img = await q.encode(text, {
    codeType: "rMQR",
    qrVersion: "AUTO",
    qrErrorLevel: "M",
    scale,
    padding: 16,
  });
  if (!img) throw new Error("Failed to encode rMQR");

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  const buf = new Uint8ClampedArray(img.data.length);
  buf.set(img.data);
  const imageData = new ImageData(buf, img.width, img.height);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

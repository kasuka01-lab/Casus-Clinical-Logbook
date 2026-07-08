export function resizeImage(file, maxDim = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width >= height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
        else if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
        const c = document.createElement("canvas");
        c.width = width; c.height = height;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function coverRegion(imgEl, rect, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const c = document.createElement("canvas");
    c.width = imgEl.naturalWidth; c.height = imgEl.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(imgEl, 0, 0);
    const sx = c.width / imgEl.clientWidth;
    const sy = c.height / imgEl.clientHeight;
    ctx.fillStyle = "#14302E";
    ctx.fillRect(rect.x * sx, rect.y * sy, rect.w * sx, rect.h * sy);
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality);
  });
}

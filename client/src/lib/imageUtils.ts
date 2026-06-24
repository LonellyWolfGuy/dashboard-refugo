// imageUtils.ts — Utilitários de otimização de imagens para o Modo TV

const MAX_LARGURA = 1920;
const MAX_ALTURA = 1080;
const QUALIDADE_JPEG = 0.8;

export interface ImagemOtimizada {
  blob: Blob;
  fileName: string;
  width: number;
  height: number;
}

export function redimensionarImagem(file: File): Promise<ImagemOtimizada> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width <= MAX_LARGURA && height <= MAX_ALTURA && file.type !== "image/webp") {
        resolve({
          blob: file,
          fileName: file.name,
          width,
          height,
        });
        URL.revokeObjectURL(img.src);
        return;
      }

      if (width > MAX_LARGURA) {
        height = Math.round((height / width) * MAX_LARGURA);
        width = MAX_LARGURA;
      }
      if (height > MAX_ALTURA) {
        width = Math.round((width / height) * MAX_ALTURA);
        height = MAX_ALTURA;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const mimeType = ext === "png" ? "image/png" : "image/jpeg";

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(img.src);
          if (blob) {
            resolve({ blob, fileName: file.name, width, height });
          } else {
            reject(new Error("Falha ao redimensionar imagem"));
          }
        },
        mimeType,
        mimeType === "image/jpeg" ? QUALIDADE_JPEG : undefined
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Falha ao carregar imagem para redimensionamento"));
    };
    img.src = URL.createObjectURL(file);
  });
}

export function blobParaFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type });
}

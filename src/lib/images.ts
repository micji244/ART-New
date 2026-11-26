// Resize a photo to max 1600px JPEG (q0.78) and return it as a data URL.
export const fileToDataUrl = async (file: File): Promise<string> => {
  let uploadFile: Blob | File = file;
  if (file.type.startsWith("image/") && typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.78));
      if (compressed) uploadFile = compressed;
    } catch (error) {
      console.warn("บีบอัดรูปภาพไม่สำเร็จ จะใช้ไฟล์ต้นฉบับ:", error);
    }
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("อ่านไฟล์ภาพไม่สำเร็จ"));
    reader.onerror = reject;

    reader.readAsDataURL(uploadFile);
  });
};

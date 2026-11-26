import type { PreviewImage } from "../types";

// Full-screen photo viewer. Clicking the backdrop or the × closes it.
export default function ImageLightbox({ image, onClose }: { image: PreviewImage; onClose: () => void }) {
  return (
    <div className="repair-image-lightbox" role="presentation" onClick={onClose}>
      <div className="repair-image-lightbox-content" role="dialog" aria-modal="true" aria-label={`ดูรูปภาพที่ ${image.index + 1}`} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="repair-image-lightbox-close" onClick={onClose} aria-label="ปิดรูปภาพ">×</button>
        <img src={image.src} alt={`รูปภาพงานซ่อม ${image.index + 1}`} />
        <p>รูปที่ {image.index + 1} · กด Esc หรือแตะพื้นที่รอบรูปเพื่อปิด</p>
      </div>
    </div>
  );
}

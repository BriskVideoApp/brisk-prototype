export function MediaUploadDropZone({ active, folderName }: { active: boolean; folderName: string }) {
  if (!active) return null;

  return (
    <div className="media-drop-zone" aria-live="polite">
      <div className="media-drop-zone-inner">
        <p>Drop to upload to {folderName}</p>
      </div>
    </div>
  );
}

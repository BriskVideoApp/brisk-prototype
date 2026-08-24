import { Button } from "../../../Brisk DS/src/app/components/Button";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaAssetStatus, MediaAssetView } from "@/data/media";
import { formatMediaBytes } from "@/lib/media";

type MediaUploadProgressProps = {
  assets: MediaAssetView[];
  destinationLabel: string;
  projectName: string;
  storageHelper: string;
  onClose: () => void;
  onRetry: (assetId: string) => void;
};

export function MediaUploadProgress({ assets, destinationLabel, projectName, storageHelper, onClose, onRetry }: MediaUploadProgressProps) {
  if (assets.length === 0) return null;
  const complete = assets.every((asset) => asset.status === "ready");

  return (
    <div className="media-modal-backdrop" role="presentation">
      <section className="media-upload-progress" role="dialog" aria-modal="true" aria-labelledby="media-upload-progress-title">
        <header className="media-upload-progress-header">
          <div>
            <span className="label-xs-semibold">{complete ? "Upload complete" : "Adding to Brisk"}</span>
            <h2 className="headings-xs-bold" id="media-upload-progress-title">{assets.length} {assets.length === 1 ? "file" : "files"}</h2>
          </div>
          <button className="media-icon-button" type="button" aria-label="Close upload progress" onClick={onClose}>
            <DsIcon name="x-close-cross" size={16} />
          </button>
        </header>

        <div className="media-upload-progress-context">
          <div><span className="label-xs">Project</span><strong className="label-s-semibold">{projectName}</strong></div>
          <div><span className="label-xs">Brisk folder</span><strong className="label-s-semibold">{destinationLabel}</strong></div>
          <p className="label-xs"><DsIcon name="info" size={14} />{storageHelper}</p>
        </div>

        <div className="media-upload-progress-list" aria-live="polite">
          {assets.map((asset) => (
            <article className={`media-upload-progress-row is-${asset.status}`} key={asset.id}>
              <span className="media-upload-progress-icon"><DsIcon name={asset.status === "ready" ? "check" : asset.status === "failed" ? "alert-triangle" : asset.kind === "audio" ? "file-audio" : asset.kind === "video" ? "file-video" : "file-text"} size={18} /></span>
              <div className="media-upload-progress-copy">
                <strong className="label-s-semibold">{asset.name}</strong>
                <span className="label-xs">{formatMediaBytes(asset.sizeBytes)} · {statusLabel(asset.status)}</span>
                <div className="media-upload-progress-track" role="progressbar" aria-label={`${asset.name}: ${asset.processingProgress ?? 0}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={asset.processingProgress ?? 0}>
                  <span style={{ width: `${asset.processingProgress ?? 0}%` }} />
                </div>
              </div>
              {asset.status === "failed" ? <button className="media-secondary-button label-xs-semibold" type="button" onClick={() => onRetry(asset.id)}><DsIcon name="arrows-clockwise" size={14} />Retry</button> : null}
            </article>
          ))}
        </div>

        <footer className="media-upload-progress-footer">
          <Button size="M" variant={complete ? "primary" : "secondary"} onClick={onClose}>{complete ? "Done" : "Continue in background"}</Button>
        </footer>
      </section>
    </div>
  );
}

export function statusLabel(status: MediaAssetStatus) {
  if (status === "uploading") return "Uploading original";
  if (status === "stored") return "Original stored";
  if (status === "preparing") return "Preparing playback";
  if (status === "failed") return "Failed - retry";
  return "Ready";
}

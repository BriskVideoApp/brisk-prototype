import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaAssetView } from "@/data/media";
import { MediaThumbnail } from "./MediaAssetCard";

export function MediaPreview({ asset, onRetry }: { asset: MediaAssetView; onRetry?: () => void }) {
  if (asset.status !== "ready") return <div className={`media-inspector-preview media-processing-preview is-${asset.status}`}><span className="media-processing-preview-icon"><DsIcon name={asset.status === "failed" ? "alert-triangle" : "arrows-clockwise"} size={28} /></span><strong className="label-s-semibold">{processingTitle(asset.status)}</strong><span className="label-xs">{asset.status === "failed" ? asset.processingError ?? "Playback preparation needs attention." : `${asset.processingProgress ?? 0}% complete`}</span><div className="media-processing-preview-track"><span style={{ width: `${asset.processingProgress ?? 0}%` }} /></div>{asset.status === "failed" && onRetry ? <button className="media-secondary-button label-s-semibold" type="button" onClick={onRetry}><DsIcon name="arrows-clockwise" size={16} />Retry</button> : null}</div>;
  if (asset.kind === "video") return <div className="media-inspector-preview is-video"><video controls preload="metadata" poster={asset.thumbnailUrl} src={asset.playbackUrl} aria-label={`Video preview for ${asset.name}`} /></div>;
  if (asset.kind === "audio") return <div className="media-inspector-preview is-audio"><MediaThumbnail asset={asset} /><audio controls preload="metadata" src={asset.playbackUrl} aria-label={`Audio preview for ${asset.name}`} /></div>;
  if (asset.kind === "image" && asset.thumbnailUrl) return <div className="media-inspector-preview is-image" style={{ backgroundImage: `url("${asset.thumbnailUrl}")` }} />;
  return <div className="media-inspector-preview is-document"><DsIcon name="file-text" size={40} /><span className="label-s-semibold">File preview</span></div>;
}

function processingTitle(status: MediaAssetView["status"]) {
  if (status === "uploading") return "Uploading original";
  if (status === "stored") return "Original stored";
  if (status === "preparing") return "Preparing playback";
  return "Playback failed";
}

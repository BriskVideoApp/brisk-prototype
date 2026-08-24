import { formatMediaBytes } from "@/lib/media";

type StorageUsageMeterProps = {
  label: string;
  helper: string;
  usedBytes?: number;
  limitBytes?: number;
};

export function StorageUsageMeter({ label, helper, usedBytes, limitBytes }: StorageUsageMeterProps) {
  const showsUsage = usedBytes !== undefined && limitBytes !== undefined;
  const percent = showsUsage ? Math.min(100, (usedBytes / limitBytes) * 100) : 100;

  return (
    <div className={`media-storage-card ${showsUsage ? "has-usage" : "is-connected"}`}>
      <div className="media-storage-copy">
        <span className="label-xs-semibold">{label}</span>
        {showsUsage ? <strong className="label-s-semibold">{formatMediaBytes(usedBytes)} of {formatMediaBytes(limitBytes)}</strong> : null}
      </div>
      {showsUsage ? <div className="media-storage-track"><span style={{ width: `${percent}%` }} /></div> : <span className="media-storage-helper label-xs">{helper}</span>}
    </div>
  );
}

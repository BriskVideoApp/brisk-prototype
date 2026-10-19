import { Button } from "../../../Brisk DS/src/app/components/Button";
import { BriskSelect } from "../../../Brisk DS/src/app/components/Select";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaCloudProvider } from "@/data/media";

type MediaUploadMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComputerUpload: () => void;
  onCloudImport: (provider: MediaCloudProvider) => void;
};

export function MediaUploadMenu({
  open,
  onOpenChange,
  onComputerUpload,
  onCloudImport,
}: MediaUploadMenuProps) {
  return <BriskSelect
    mode="action"
    ariaLabel="Upload media"
    placeholder="Upload"
    value=""
    clearable={false}
    open={open}
    onOpenChange={onOpenChange}
    className="media-upload-menu-wrap"
    options={[
      { value: "computer", label: "From your computer" },
      { value: "google-drive", label: "Google Drive" },
      { value: "dropbox", label: "Dropbox" },
    ]}
    onChange={(source) => {
      if (source === "computer") onComputerUpload();
      else if (source === "google-drive" || source === "dropbox") onCloudImport(source);
    }}
    actionTrigger={(triggerProps) => <Button {...triggerProps} size="S" variant="primary"
      className="media-primary-button"
      type="button"
      aria-label="Upload"
    >
      <DsIcon name="plus" size={16} />
      Upload
      <DsIcon name="caret-down" size={14} />
    </Button>}
  />;
}

import { videoTypeIconMap } from "@/components/brief/videoTypeIcons";
import { DsIcon } from "@/components/video-review/DsIcon";
import { briefVideoTypeDetails } from "@/data/brief";
import type { StudioReviewDraft } from "@/data/studio-onboard";

export function StudioClientPortalPreview({
  draft,
  onPreviewBrief,
}: {
  draft: StudioReviewDraft;
  onPreviewBrief: () => void;
}) {
  const selectedVideoTypes = briefVideoTypeDetails.filter((videoType) => draft.videoTypeIds.includes(videoType.name));

  return (
    <article
      className={`studio-client-portal studio-client-accent-${draft.brandAccentId}`}
      aria-label={`Client portal preview for ${draft.studioName}`}
    >
      <header className="studio-client-portal-header">
        <StudioPreviewLogo draft={draft} />
        <div>
          <strong className="label-m-semibold">{draft.studioName}</strong>
          <span className="label-xs">{draft.studioType}</span>
        </div>
      </header>

      <div className="studio-client-portal-content studio-client-portal-welcome">
        <div>
          <h2 className="headings-s-bold">Tell us about your video</h2>
          <p className="paragraph-s">{draft.studioDescription}</p>
        </div>
        <section className="studio-client-offer-preview" aria-labelledby="studio-client-offer-heading">
          <h3 className="label-m-semibold" id="studio-client-offer-heading">Available video types</h3>
          <div className="studio-client-offer-chips">
            {selectedVideoTypes.map((videoType) => (
              <span className="studio-client-offer-chip label-xs-semibold" key={videoType.name}>
                <DsIcon name={videoTypeIconMap[videoType.name] ?? "film-strip"} size={14} />
                {videoType.name}
              </span>
            ))}
          </div>
        </section>
        <button className="studio-client-brief-entry" type="button" onClick={onPreviewBrief}>
          <span className="studio-client-brief-entry-icon"><DsIcon name="clipboard-text" size={20} /></span>
          <div>
            <strong className="label-m-semibold">Your video Brief</strong>
            <span className="label-xs">Six guided questions</span>
          </div>
          <DsIcon name="caret-right" size={16} />
        </button>
      </div>
    </article>
  );
}

export function StudioPreviewLogo({ draft }: { draft: StudioReviewDraft }) {
  return (
    <span className="studio-client-logo" aria-label={`${draft.studioName} logo`}>
      {draft.logoPreviewUrl ? (
        // A local data URL is used only for the shallow prototype preview.
        <img src={draft.logoPreviewUrl} alt="" />
      ) : (
        <span className="headings-2xs-bold">{getStudioInitials(draft.studioName)}</span>
      )}
    </span>
  );
}

function getStudioInitials(studioName: string) {
  return studioName
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toLocaleUpperCase("en-AU"))
    .join("");
}

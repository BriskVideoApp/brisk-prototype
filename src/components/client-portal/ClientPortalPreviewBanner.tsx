import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { DsIcon } from "@/components/video-review/DsIcon";

export function ClientPortalPreviewBanner({
  clientName,
  sample = false,
}: {
  clientName: string;
  sample?: boolean;
}) {
  const searchParams = useSearchParams();
  const { setSelectedRole } = usePrototypeRole();
  const returnsFromClientRolePreview = searchParams.get("client-preview") === "1";
  const previewExplanation = sample
    ? "This is an example of the Client portal. It does not show a real Client or their videos."
    : `You're viewing Brisk as ${clientName}. Only the projects and chats available to them are shown.`;

  return (
    <aside className="customer-portal-preview-banner" aria-label="Client portal preview">
      <div className="customer-portal-preview-banner-content">
        <DsIcon name="eye" size={18} />
        <div>
          <p
            className="label-s-semibold"
            data-tooltip={previewExplanation}
            tabIndex={0}
            aria-label={`${sample ? "Previewing a sample Client portal" : `Previewing ${clientName}'s Client portal`}. ${previewExplanation}`}
          >
            {sample ? "Previewing a sample Client portal" : <>Previewing {clientName}&apos;s Client portal</>}
          </p>
        </div>
      </div>
      <Link
        className="customer-dashboard-secondary-button label-s-semibold"
        href={sample ? "/settings/studio" : "/active-videos"}
        onClick={() => {
          if (returnsFromClientRolePreview) setSelectedRole("Studio Staff");
        }}
      >
        {sample ? "Back to Studio setup" : "Back to Videos"}
      </Link>
    </aside>
  );
}

import { notFound } from "next/navigation";
import { StudioNotificationCategoryPage } from "@/components/settings/StudioNotificationCategoryPage";
import { StudioSettingsShell } from "@/components/settings/StudioSettingsShell";
import {
  getStudioNotificationCopyCategory,
  studioNotificationCopyCategories,
} from "@/data/studio-notification-copy";

export function generateStaticParams() {
  return studioNotificationCopyCategories.map((category) => ({
    categoryId: category.id,
  }));
}

export default async function StudioNotificationCategoryRoute({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const category = getStudioNotificationCopyCategory(categoryId);

  if (!category) notFound();

  return (
    <StudioSettingsShell sectionId="notifications">
      <StudioNotificationCategoryPage category={category} />
    </StudioSettingsShell>
  );
}

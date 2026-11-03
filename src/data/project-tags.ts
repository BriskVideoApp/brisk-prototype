export type TagClass = "critical" | "high-priority" | "in-review" | "neutral" | "green" | "peach" | "cream";

export const tagColourOptions: { className: TagClass; label: string }[] = [
  { className: "critical", label: "Purple" },
  { className: "high-priority", label: "Blue" },
  { className: "neutral", label: "Grey" },
  { className: "green", label: "Green" },
  { className: "peach", label: "Peach" },
  { className: "cream", label: "Cream" },
];
export function getTagClass(name: string, classes: Record<string, TagClass>) {
  return classes[name] ?? "in-review";
}

export type ClientVideoTagCollection = {
  workspaceId: string;
  clientId: string;
  colours: Record<string, TagClass>;
  projectTags: Record<string, string[]>;
};

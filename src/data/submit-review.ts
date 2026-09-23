export type SubmitDestination = "customer" | "studio";

export function defaultSubmitMessage(subject: string, projectName: string, destination: SubmitDestination) {
  return destination === "customer"
    ? `Please review the ${subject} for ${projectName} and share any feedback.`
    : `The ${subject} and its comments for ${projectName} are ready for you.`;
}

export function mentionedProjectMembers(message: string, members: readonly string[]) {
  return members.map((name) => {
    const mention = `@${name}`;
    let index = message.indexOf(mention);
    while (index !== -1) {
      const next = message[index + mention.length];
      if (!next || !/[\p{L}\p{N}]/u.test(next)) return { name, index };
      index = message.indexOf(mention, index + mention.length);
    }
    return null;
  }).filter((match): match is { name: string; index: number } => match !== null)
    .sort((left, right) => left.index - right.index)
    .map((match) => match.name);
}

export function formatMentionedPeople(names: readonly string[]) {
  const firstNames = names.map((name) => name.split(/\s+/u)[0]);
  const displayNames = names.map((name, index) => firstNames.indexOf(firstNames[index]) === firstNames.lastIndexOf(firstNames[index]) ? firstNames[index] : name);
  if (displayNames.length < 2) return displayNames[0] ?? "";
  if (displayNames.length === 2) return displayNames.join(" and ");
  return `${displayNames.slice(0, -1).join(", ")} and ${displayNames.at(-1)}`;
}

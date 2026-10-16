

export function formatBriefDate(value: string) {
  const [yearValue, monthValue, dayValue] = value.split("-").map(Number);

  if (!yearValue || !monthValue || !dayValue) {
    return "";
  }

  const date = new Date(yearValue, monthValue - 1, dayValue);
  const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(date);

  return `${dayValue} ${month}, ${yearValue}`;
}

export function parseBriefDateValue(value: string) {
  const [yearValue, monthValue, dayValue] = value.split("-").map(Number);

  if (!yearValue || !monthValue || !dayValue) {
    return null;
  }

  return new Date(yearValue, monthValue - 1, dayValue);
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("The selected logo could not be read."));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("The selected logo could not be read.")));
    reader.readAsDataURL(file);
  });
}

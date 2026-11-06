export function captureVideoPoster(file: File, maxDimension = 160): Promise<string | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let finished = false;
    const finish = (posterUrl?: string) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      video.pause();
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(posterUrl);
    };
    const capture = () => {
      if (!video.videoWidth || !video.videoHeight) { finish(); return; }
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) { finish(); return; }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.68));
      } catch { finish(); }
    };
    const timeout = window.setTimeout(() => finish(), 4000);
    video.muted = true;
    video.preload = "auto";
    video.onloadedmetadata = () => {
      if (video.duration > 0.2) video.currentTime = Math.min(0.2, video.duration / 2);
      else capture();
    };
    video.onseeked = capture;
    video.onerror = () => finish();
    video.src = url;
  });
}

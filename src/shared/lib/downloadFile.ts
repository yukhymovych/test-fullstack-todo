export function downloadFile(input: {
  fileName: string;
  mimeType: string;
  content: string | Blob;
}) {
  const blob =
    input.content instanceof Blob
      ? input.content
      : new Blob([input.content], { type: input.mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = input.fileName;
  anchor.click();

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

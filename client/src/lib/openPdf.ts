export async function openPdfUrl(url: string) {
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    // Open blob URL in new tab/window
    const win = window.open(blobUrl, '_blank');
    if (!win) {
      // Fallback: navigate current window
      window.location.href = blobUrl;
    }
    // Revoke URL after a minute
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60 * 1000);
  } catch (err) {
    console.error('Failed to open PDF URL', err);
    throw err;
  }
}

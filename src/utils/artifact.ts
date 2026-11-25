/**
 * True in the build published as a Claude Artifact (`VITE_ARTIFACT=1`). That
 * page runs in a locked-down frame: no service worker, no network calls (so
 * no AI), no direct file downloads, and no real URL to route on. The few
 * places that differ check this flag; the normal build never sets it.
 */
export const IS_ARTIFACT = import.meta.env.VITE_ARTIFACT === '1';

interface DownloadsCapability {
  save(request: { filename: string; data: string }): Promise<unknown>;
}

/**
 * Hand a text file to the viewer through the Artifact `downloads`
 * capability. Resolves true when saved, false when the viewer declined or
 * saving isn't available in this view.
 */
export async function saveFileInArtifact(filename: string, data: string): Promise<boolean> {
  const claude = (window as unknown as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
  try {
    const downloads = (await claude?.use?.('downloads')) as DownloadsCapability | null | undefined;
    if (!downloads) return false;
    await downloads.save({ filename, data });
    return true;
  } catch {
    return false;
  }
}

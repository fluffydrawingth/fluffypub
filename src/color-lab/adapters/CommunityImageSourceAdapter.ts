import type { UploadedImage } from '@/features/image-upload'

/**
 * Not built yet — a future "import from a Community post" flow would feed
 * `ImagePaletteTool` an image without going through the file dropzone.
 * Interface only; the standalone app has no Community feature, so there is
 * no default implementation to wire in. See
 * docs/integration-with-fluffypub.md.
 */
export interface CommunityImageSourceAdapter {
  getImage(postId: string): Promise<UploadedImage | null>
}

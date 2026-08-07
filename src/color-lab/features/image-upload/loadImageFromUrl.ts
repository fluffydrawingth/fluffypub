import type { UploadedImage } from './types'

/**
 * Builds an UploadedImage from a remote URL instead of a local File — for a
 * host app importing an image from elsewhere (e.g. Fluffy Pub's
 * CommunityImageSourceAdapter pulling a Community post's photo). Requires
 * the remote host to send CORS headers permissive enough for
 * `crossOrigin: 'anonymous'`, or extraction's `getImageData` call will throw
 * a SecurityError later — the Image element's load/error events can't tell
 * a CORS block apart from a network failure, so both surface the same
 * message here.
 */
export function loadImageFromUrl(url: string, fileName = 'image'): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const element = new Image()
    element.crossOrigin = 'anonymous'

    element.onload = () => {
      resolve({ element, url, fileName })
    }

    element.onerror = () => {
      reject(new Error('Could not load that image. It may be missing or block cross-origin access.'))
    }

    element.src = url
  })
}

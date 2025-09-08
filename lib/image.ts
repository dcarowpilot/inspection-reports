import imageCompression from 'browser-image-compression';

export async function compressImage(file: File) {
  return imageCompression(file, {
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    maxSizeMB: 1.5,
  });
}

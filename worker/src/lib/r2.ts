export async function uploadToR2(bucket: R2Bucket, key: string, file: ArrayBuffer, contentType: string) {
  await bucket.put(key, file, {
    httpMetadata: { contentType },
  });
  return key;
}

export async function getFromR2(bucket: R2Bucket, key: string) {
  return await bucket.get(key);
}

export async function deleteFromR2(bucket: R2Bucket, key: string) {
  await bucket.delete(key);
}

export function generateR2Key(folder: string, filename: string): string {
  const ext = filename.split('.').pop() || 'bin';
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return `${folder}/${id}.${ext}`;
}

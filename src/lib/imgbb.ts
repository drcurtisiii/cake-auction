/**
 * ImgBB image upload helper.
 * Uploads a base64-encoded image and returns the public URL.
 */

export async function uploadImage(
  base64Image: string
): Promise<{ url: string; deleteUrl: string }> {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error('IMGBB_API_KEY environment variable is not set');
  }

  const formData = new FormData();
  formData.append('key', apiKey);
  formData.append('image', base64Image);

  const response = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ImgBB upload failed (${response.status}): ${text}`);
  }

  const json = await response.json();

  if (!json.success) {
    throw new Error(`ImgBB upload failed: ${json.error?.message || 'Unknown error'}`);
  }

  return {
    url: json.data.display_url || json.data.url,
    deleteUrl: json.data.delete_url || '',
  };
}

/** Compress image file for upload (JPEG, max width, quality). */
export const compressImage = (file, maxWidth = 800, quality = 0.72) =>
  new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('Please select an image file'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) reject(new Error('Compression failed'));
            else resolve(new File([blob], 'fine.jpg', { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

export const uploadImageToImgbb = async (file) => {
  const key = import.meta.env.VITE_IMGBB_API_KEY;
  if (!key) throw new Error('Image upload is not configured (VITE_IMGBB_API_KEY)');
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, { method: 'POST', body: formData });
  const data = await res.json();
  if (!data?.success) throw new Error(data?.error?.message || 'Upload failed');
  return data.data.url;
};

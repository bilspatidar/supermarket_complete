export function getProductImageUrl(product) {
    if (!product || Number(product.is_image) !== 1) {
      return '/images/swastik_thumb.webp';
    }
  
    const filename = product.image;
  
    if (!filename) {
      return '/images/swastik_thumb.webp';
    }
  
    const baseUrl =
      import.meta.env.VITE_PRODUCT_IMAGE_URL || '';
  
    return `${baseUrl.replace(/\/$/, '')}/${filename.replace(/^\//, '')}`;
  }
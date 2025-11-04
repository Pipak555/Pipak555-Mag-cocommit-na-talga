/**
 * Cloudinary Image Upload Utility
 * 
 * This module handles image uploads to Cloudinary instead of Firebase Storage.
 * 
 * To use Cloudinary:
 * 1. Sign up at https://cloudinary.com (free tier available)
 * 2. Get your Cloud Name from the dashboard
 * 3. Create an UNSIGNED upload preset in Settings → Upload → Upload presets
 * 4. Add to your .env file:
 *    VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_name
 * 
 * IMPORTANT: Do NOT add API Secret to .env - it should NEVER be in client-side code!
 * Only use unsigned upload presets for client-side uploads (secure).
 */

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Upload a single image to Cloudinary
 * @param file - The image file to upload
 * @param folder - Optional folder path in Cloudinary (e.g., "listings/{listingId}")
 * @returns Promise<string> - The secure URL of the uploaded image
 */
export const uploadImageToCloudinary = async (
  file: File,
  folder?: string
): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName) {
    throw new Error('Cloudinary Cloud Name is not configured. Please add VITE_CLOUDINARY_CLOUD_NAME to your .env file');
  }

  // Create form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset || 'ml_default'); // Use unsigned preset if available
  
  // Add folder if provided
  if (folder) {
    formData.append('folder', folder);
  }

  // Add transformation parameters (optional - optimize images)
  formData.append('transformation', 'f_auto,q_auto'); // Auto format and quality

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || 
        `Cloudinary upload failed: ${response.status} ${response.statusText}`
      );
    }

    const data: CloudinaryUploadResponse = await response.json();
    return data.secure_url;
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param files - Array of image files to upload
 * @param listingId - The listing ID to organize images in a folder
 * @param onProgress - Optional callback for upload progress (0-100)
 * @returns Promise<string[]> - Array of secure URLs for uploaded images
 */
export const uploadListingImages = async (
  files: File[],
  listingId: string,
  onProgress?: (progress: number) => void
): Promise<string[]> => {
  const folder = `listings/${listingId}`;
  const urls: string[] = [];
  const totalFiles = files.length;

  for (let i = 0; i < files.length; i++) {
    try {
      const url = await uploadImageToCloudinary(files[i], folder);
      urls.push(url);
      
      // Update progress if callback provided
      if (onProgress) {
        const progress = Math.round(((i + 1) / totalFiles) * 100);
        onProgress(progress);
      }
    } catch (error: any) {
      console.error(`Failed to upload image ${i + 1}:`, error);
      throw new Error(`Failed to upload image ${i + 1}: ${error.message}`);
    }
  }

  return urls;
};

/**
 * Delete an image from Cloudinary (if needed)
 * Note: This requires API secret, so should be done server-side for security
 * For now, we'll just return a placeholder function
 */
export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
  // This would require server-side implementation with API secret
  // For now, images are kept in Cloudinary (they have free tier)
  console.warn('Image deletion should be handled server-side for security');
};


const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a local file to Cloudinary and delete the local file.
 * @param {string} filePath - Absolute path to the local file
 * @param {object} [options] - Additional Cloudinary upload options (e.g. folder)
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
async function uploadToCloudinary(filePath, options = {}) {
  try {
    if (!filePath) {
      throw new Error('File path is required');
    }

    const uploadOptions = {
      folder: process.env.CLOUDINARY_FOLDER || 'Medeasy Uploads',
      ...options
    };

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);
    
    // Clean up local temp file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (unlinkErr) {
      console.error('Error deleting temp file in uploadToCloudinary:', unlinkErr);
    }

    return result.secure_url;
  } catch (error) {
    // Make sure we delete local file even on failure
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (unlinkErr) {
      console.error('Error deleting temp file after failed uploadToCloudinary:', unlinkErr);
    }
    throw error;
  }
}

module.exports = {
  cloudinary,
  uploadToCloudinary
};

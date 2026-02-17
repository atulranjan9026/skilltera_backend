const cloudinary = require('cloudinary').v2;
const logger = require('../shared/utils/logger');

/**
 * Configure Cloudinary (only when valid credentials are present)
 */
const configureCloudinary = () => {
    const name = process.env.CLOUDINARY_CLOUD_NAME;
    if (!name || name === 'your-cloud-name') {
        return; // Skip - will use local storage fallback
    }
    try {
        cloudinary.config({
            cloud_name: name,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    } catch (error) {
        logger.error('Failed to configure Cloudinary:', error);
    }
};

/**
 * Upload file to Cloudinary
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} folder - Cloudinary folder name
 * @param {string} resourceType - Resource type (image, raw, video, auto)
 * @returns {Promise<object>} Upload result
 */
const uploadToCloudinary = (fileBuffer, folder = 'skilltera', resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: resourceType,
            },
            (error, result) => {
                if (error) {
                    logger.error('Cloudinary upload error:', error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        uploadStream.end(fileBuffer);
    });
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type
 * @returns {Promise<object>} Delete result
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        return result;
    } catch (error) {
        logger.error('Cloudinary delete error:', error);
        throw error;
    }
};

module.exports = {
    configureCloudinary,
    uploadToCloudinary,
    deleteFromCloudinary,
    cloudinary,
};

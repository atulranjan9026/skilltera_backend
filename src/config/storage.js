const fs = require('fs');
const path = require('path');
const { uploadToCloudinary, deleteFromCloudinary } = require('./cloudinary');
const logger = require('../shared/utils/logger');

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'resumes');
const isCloudinaryConfigured = () => {
    const name = process.env.CLOUDINARY_CLOUD_NAME;
    return name && name !== 'your-cloud-name' && name.trim().length > 0;
};

/**
 * Ensure uploads directory exists
 */
const ensureUploadsDir = () => {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
};

/**
 * Upload file - uses Cloudinary if configured, otherwise local storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} folder - Folder name (for Cloudinary) or unused (local)
 * @param {string} resourceType - Resource type for Cloudinary
 * @param {string} filename - Original filename (for local storage)
 * @returns {Promise<{secure_url: string, public_id: string}>}
 */
const uploadFile = async (fileBuffer, folder = 'skilltera', resourceType = 'raw', filename = 'resume') => {
    if (isCloudinaryConfigured()) {
        const result = await uploadToCloudinary(fileBuffer, folder, resourceType);
        return { secure_url: result.secure_url, public_id: result.public_id };
    }

    // Local storage fallback for development
    ensureUploadsDir();
    const ext = path.extname(filename) || '.pdf';
    const localFilename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(UPLOADS_DIR, localFilename);
    fs.writeFileSync(filePath, fileBuffer);

    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5001}`;
    const secure_url = `${baseUrl}/uploads/resumes/${localFilename}`;
    const public_id = `local:${localFilename}`;

    return { secure_url, public_id };
};

/**
 * Delete file - uses Cloudinary if public_id is from Cloudinary, otherwise removes local file
 * @param {string} publicId - Cloudinary public_id or local:filename
 * @param {string} resourceType - Resource type for Cloudinary
 */
const deleteFile = async (publicId, resourceType = 'raw') => {
    if (publicId.startsWith('local:')) {
        const filename = publicId.replace('local:', '');
        const filePath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return;
    }
    await deleteFromCloudinary(publicId, resourceType);
};

module.exports = {
    uploadFile,
    deleteFile,
    isCloudinaryConfigured,
};

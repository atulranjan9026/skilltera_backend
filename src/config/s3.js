/**
 * AWS S3 upload utility
 * Uses SKILLTERA_AWS_* env vars for the general-purpose bucket
 * Uses SESSION_BUCKET_* env vars for video/session uploads
 */
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// General-purpose bucket (resumes, images, etc.)
const GENERAL_CONFIG = {
    bucket: process.env.AWS_BUCKET_NAME,
    region: process.env.AWS_BUCKET_REGION,
    accessKey: process.env.SKILLTERA_AWS_ACCESS_KEY,
    secretKey: process.env.SKILLTERA_AWS_SECRET_KEY,
};

// Session/video bucket (env scan, self-intro, proctoring videos)
const SESSION_CONFIG = {
    bucket: process.env.SESSION_BUCKET,
    region: process.env.SESSION_BUCKET_REGION,
    accessKey: process.env.SESSION_BUCKET_ACCESS_KEY || process.env.SESSION_BUCKET_ASSESS_KEY,
    secretKey: process.env.SESSION_BUCKET_SECRET_KEY,
};

function createClient(config) {
    if (!config.bucket || !config.region || !config.accessKey || !config.secretKey) return null;
    return new S3Client({
        region: config.region,
        credentials: {
            accessKeyId: config.accessKey,
            secretAccessKey: config.secretKey,
        },
    });
}

/**
 * Upload a buffer to S3
 * @param {Buffer} buffer - File buffer
 * @param {string} key - S3 object key (path)
 * @param {string} contentType - MIME type
 * @param {'general'|'session'} bucket - Which bucket to use
 * @returns {Promise<{location: string, key: string, bucket: string}>}
 */
async function uploadToS3(buffer, key, contentType = 'application/octet-stream', bucket = 'session') {
    const config = bucket === 'general' ? GENERAL_CONFIG : SESSION_CONFIG;
    const client = createClient(config);
    if (!client) {
        throw new Error(`S3 not configured for ${bucket} bucket`);
    }

    const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'private',
    });

    await client.send(command);

    const location = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
    return { location, key, bucket: config.bucket };
}

/**
 * Delete an object from S3
 */
async function deleteFromS3(key, bucket = 'session') {
    const config = bucket === 'general' ? GENERAL_CONFIG : SESSION_CONFIG;
    const client = createClient(config);
    if (!client) return;

    const command = new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
    });
    await client.send(command);
}

function isS3Configured(bucket = 'session') {
    const config = bucket === 'general' ? GENERAL_CONFIG : SESSION_CONFIG;
    return !!(config.bucket && config.region && config.accessKey && config.secretKey);
}

module.exports = { uploadToS3, deleteFromS3, isS3Configured };

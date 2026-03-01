/**
 * Session Upload Controller - S3 multipart for proctoring/session videos
 * Requires: SESSION_BUCKET, SESSION_BUCKET_REGION, SESSION_BUCKET_ACCESS_KEY, SESSION_BUCKET_SECRET_KEY
 * Uses AWS SDK v3 (@aws-sdk/client-s3)
 */
const {
    S3Client,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    ListPartsCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const asyncHandler = require('../../../shared/utils/asyncHandler');
const ApiError = require('../../../shared/utils/ApiError');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');

const S3_CONFIG = {
    bucket: process.env.SESSION_BUCKET,
    region: process.env.SESSION_BUCKET_REGION,
    accessKey: process.env.SESSION_BUCKET_ACCESS_KEY || process.env.SESSION_BUCKET_ASSESS_KEY,
    secretKey: process.env.SESSION_BUCKET_SECRET_KEY,
};

function isS3Configured() {
    return S3_CONFIG.bucket && S3_CONFIG.region && S3_CONFIG.accessKey && S3_CONFIG.secretKey;
}

function getS3Client() {
    if (!isS3Configured()) return null;
    try {
        return new S3Client({
            region: S3_CONFIG.region,
            credentials: {
                accessKeyId: S3_CONFIG.accessKey,
                secretAccessKey: S3_CONFIG.secretKey,
            },
        });
    } catch {
        return null;
    }
}

/**
 * POST /initiate
 */
exports.initiate = asyncHandler(async (req, res) => {
    const s3 = getS3Client();
    if (!s3) {
        throw new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, 'Session upload requires S3 configuration (SESSION_BUCKET_*)');
    }
    const candidateId = req.userId?.toString?.() || 'anon';
    const { sessionId, contentType = 'application/octet-stream', extension = 'webm', type, label } = req.body || {};
    const folder = sessionId || candidateId;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const t = (type || '').toString().toLowerCase();
    let key;
    if (t === 'selfintro') {
        const safeLabel = (label || 'q').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'q';
        key = `${folder}/selfIntro/self-intro-${safeLabel}-${timestamp}.${extension}`;
    } else if (t === 'envscan') {
        const safeLabel = (label || 'pre').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'pre';
        key = `${folder}/envScan/env-scan-${safeLabel}-${timestamp}.${extension}`;
    } else {
        key = `${folder}/sessionsVideos/recording-session-${timestamp}.${extension}`;
    }
    const command = new CreateMultipartUploadCommand({
        Bucket: S3_CONFIG.bucket,
        Key: key,
        ContentType: contentType,
        ACL: 'private',
    });
    const result = await s3.send(command);
    res.status(200).json({ uploadId: result.UploadId, key });
});

/**
 * GET /sign?uploadId=&key=&partNumber=
 */
exports.sign = asyncHandler(async (req, res) => {
    const s3 = getS3Client();
    if (!s3) throw new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, 'Session upload requires S3 configuration');
    const { uploadId, key, partNumber } = req.query;
    if (!uploadId || !key || !partNumber) {
        throw ApiError.badRequest('uploadId, key and partNumber are required');
    }
    const command = new UploadPartCommand({
        Bucket: S3_CONFIG.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: parseInt(partNumber, 10),
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.status(200).json({ url });
});

/**
 * GET /parts?uploadId=&key=
 */
exports.parts = asyncHandler(async (req, res) => {
    const s3 = getS3Client();
    if (!s3) throw new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, 'Session upload requires S3 configuration');
    const { uploadId, key } = req.query;
    if (!uploadId || !key) throw ApiError.badRequest('uploadId and key are required');
    const command = new ListPartsCommand({
        Bucket: S3_CONFIG.bucket,
        Key: key,
        UploadId: uploadId,
    });
    const result = await s3.send(command);
    const parts = result.Parts || [];
    res.status(200).json({ parts: parts.map(p => ({ ETag: p.ETag, PartNumber: p.PartNumber, Size: p.Size })) });
});

/**
 * POST /complete - body: { uploadId, key, parts: [{ ETag, PartNumber }] }
 */
exports.complete = asyncHandler(async (req, res) => {
    const s3 = getS3Client();
    if (!s3) throw new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, 'Session upload requires S3 configuration');
    const { uploadId, key, parts } = req.body || {};
    if (!uploadId || !key || !Array.isArray(parts) || parts.length === 0) {
        throw ApiError.badRequest('uploadId, key and parts[] are required');
    }
    const ordered = parts
        .map(p => ({ ETag: p.ETag, PartNumber: Number(p.PartNumber) }))
        .sort((a, b) => a.PartNumber - b.PartNumber);
    const command = new CompleteMultipartUploadCommand({
        Bucket: S3_CONFIG.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: ordered },
    });
    const result = await s3.send(command);
    res.status(200).json({ location: result.Location, bucket: result.Bucket, key: result.Key });
});

/**
 * POST /abort - body: { uploadId, key }
 */
exports.abort = asyncHandler(async (req, res) => {
    const s3 = getS3Client();
    if (!s3) throw new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, 'Session upload requires S3 configuration');
    const { uploadId, key } = req.body || {};
    if (!uploadId || !key) throw ApiError.badRequest('uploadId and key are required');
    const command = new AbortMultipartUploadCommand({
        Bucket: S3_CONFIG.bucket,
        Key: key,
        UploadId: uploadId,
    });
    await s3.send(command);
    res.status(200).json({ aborted: true });
});

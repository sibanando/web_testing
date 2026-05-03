const { S3Client, CreateBucketCommand, PutBucketPolicyCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || '';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || '';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || '';
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'apnidunia';
const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || MINIO_ENDPOINT;

let s3 = null;

if (MINIO_ENDPOINT && MINIO_ACCESS_KEY && MINIO_SECRET_KEY) {
    s3 = new S3Client({
        endpoint: MINIO_ENDPOINT,
        region: 'us-east-1',
        credentials: {
            accessKeyId: MINIO_ACCESS_KEY,
            secretAccessKey: MINIO_SECRET_KEY,
        },
        forcePathStyle: true, // required for MinIO
    });
}

async function initBucket() {
    if (!s3) return;
    try {
        // Check if bucket exists
        try {
            await s3.send(new HeadBucketCommand({ Bucket: MINIO_BUCKET }));
        } catch {
            // Create bucket if it doesn't exist
            await s3.send(new CreateBucketCommand({ Bucket: MINIO_BUCKET }));
            console.log(`[Storage] Created MinIO bucket: ${MINIO_BUCKET}`);
        }

        // Set public-read policy so images are accessible without auth
        const policy = JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`],
            }],
        });
        await s3.send(new PutBucketPolicyCommand({ Bucket: MINIO_BUCKET, Policy: policy }));
        console.log('[Storage] MinIO connected and bucket ready');
    } catch (err) {
        console.error('[Storage] MinIO init error:', err.message);
    }
}

// Upload a buffer to MinIO, returns the public URL
async function uploadBuffer(filename, buffer, mimeType) {
    if (!s3) return null;
    await s3.send(new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: mimeType,
    }));
    return `/uploads/${filename}`;
}

function isConfigured() {
    return s3 !== null;
}

module.exports = { initBucket, uploadBuffer, isConfigured };

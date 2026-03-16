import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadVideo(filePath: string, jobId: string): Promise<string> {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
            filePath,
            {
                resource_type: 'video',
                public_id: `facelessvideo/${jobId}`,
            },
            (error, result) => {
                if (error || !result) {
                    reject(error || new Error('Failed to upload to Cloudinary'));
                } else {
                    resolve(result.secure_url);
                }
            }
        );
    });
}

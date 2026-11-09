import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dnvnftvky',
  api_key: process.env.CLOUDINARY_API_KEY || '259851568455899',
  api_secret: process.env.CLOUDINARY_API_SECRET || '3hRsXzUVd3pnwn9IKQWN7UAeJLc',
  secure: true,
});

export async function uploadEncryptedBufferToCloudinary(
  buffer: Buffer,
  publicId?: string
): Promise<{ secureUrl: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: 'adois_encrypted_vault',
        public_id: publicId,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Falha no upload para o Cloudinary'));
        }
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export default cloudinary;


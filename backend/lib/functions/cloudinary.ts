import { v2 as cloudinary, type UploadApiOptions } from "cloudinary";

let cloudinaryConfigured = false;

const configureCloudinary = () => {
  if (cloudinaryConfigured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Missing Cloudinary configuration. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  cloudinaryConfigured = true;
};

export const uploadImageToCloudinary = (
  buffer: Buffer,
  options: UploadApiOptions = {},
) =>
  new Promise<string>((resolve, reject) => {
    configureCloudinary();

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url) {
          reject(new Error("Cloudinary did not return a secure URL."));
          return;
        }

        resolve(result.secure_url);
      },
    );

    stream.end(buffer);
  });

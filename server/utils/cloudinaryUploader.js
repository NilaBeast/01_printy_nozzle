import cloudinary from "../config/cloudinary.js";
import fs from "fs";

/* ---------- Delete Local File ---------- */
const removeLocalFile = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err) console.error("File delete error:", err);
  });
};


/* ===================== UPLOAD ===================== */

export async function uploadFile({
  filePath,          // required
  folder,            // required
  resourceType,      // "image" | "raw" | "video" | "auto"
  publicId,          // optional
  transformation,    // optional (array)
}) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
      public_id: publicId,
      transformation,
    });

    removeLocalFile(filePath);

    return {
      public_id: result.public_id,
      url: result.secure_url,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    removeLocalFile(filePath);
    throw error;
  }
}


/* ===================== UPLOAD BUFFER ===================== */

export async function uploadBuffer({
  buffer,            // REQUIRED (Buffer)
  folder,            // REQUIRED
  publicId,          // REQUIRED
  resourceType = "image",
}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        format: "png",
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          public_id: result.public_id,
          url: result.secure_url,
          resource_type: result.resource_type,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    stream.end(buffer);
  });
}


/* ===================== DELETE ===================== */

export async function deleteFile({
  publicId,
  resourceType, // "image" | "raw" | "video"
}) {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
}
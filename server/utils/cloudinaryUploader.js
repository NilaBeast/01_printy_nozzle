const cloudinary = require("../config/cloudinary");
const fs = require("fs");

/* ---------- Delete Local File ---------- */
const removeLocalFile = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err) console.error("File delete error:", err);
  });
};

/* ===================== UPLOAD ===================== */
const uploadFile = async ({ filePath, folder, resourceType, publicId, transformation }) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType || "auto",
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
};

/* ===================== UPLOAD BUFFER ===================== */
const uploadBuffer = async ({ buffer, folder, publicId, resourceType = "image" }) => {
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
};

/* ===================== DELETE ===================== */
const deleteFile = async ({ publicId, resourceType }) => {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
};

module.exports = { uploadFile, uploadBuffer, deleteFile };
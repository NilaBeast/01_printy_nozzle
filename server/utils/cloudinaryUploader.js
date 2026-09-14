const cloudinary = require("../config/cloudinary");
const fs = require("fs");

/* ---------- Delete Local File ---------- */
const removeLocalFile = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err) console.error("File delete error:", err);
  });
};

/* ---------- Resolve flexible upload arguments ----------
   Supports:
   - uploadFile({ filePath, folder, resourceType, publicId, transformation })
   - uploadFile(bufferOrPathOrMulterFile, folder, resourceType)
---------------------------------------------------------------- */
const resolveUploadArgs = (source, folderArg, resourceTypeArg) => {
  if (
    source &&
    typeof source === "object" &&
    !Buffer.isBuffer(source) &&
    (source.filePath !== undefined || source.buffer !== undefined || source.file !== undefined || source.folder !== undefined)
  ) {
    const file = source.file || {};
    return {
      filePath: source.filePath || file.path,
      buffer: source.buffer || file.buffer,
      folder: source.folder,
      resourceType: source.resourceType,
      publicId: source.publicId,
      transformation: source.transformation,
    };
  }

  if (typeof source === "string") {
    return { filePath: source, folder: folderArg, resourceType: resourceTypeArg };
  }

  if (Buffer.isBuffer(source)) {
    return { buffer: source, folder: folderArg, resourceType: resourceTypeArg };
  }

  if (source && typeof source === "object") {
    // multer file object (diskStorage -> path, memoryStorage -> buffer)
    return { filePath: source.path, buffer: source.buffer, folder: folderArg, resourceType: resourceTypeArg };
  }

  return { folder: folderArg, resourceType: resourceTypeArg };
};

/* ===================== UPLOAD (flexible) ===================== */
const uploadFile = async (source, folderArg, resourceTypeArg) => {
  const { filePath, buffer, folder, resourceType, publicId, transformation } = resolveUploadArgs(
    source,
    folderArg,
    resourceTypeArg
  );

  const options = {
    folder,
    resource_type: resourceType || "auto",
    public_id: publicId,
    transformation,
  };

  try {
    let result;
    if (buffer) {
      result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, res) =>
          error ? reject(error) : resolve(res)
        );
        stream.end(buffer);
      });
    } else if (filePath) {
      result = await cloudinary.uploader.upload(filePath, options);
    } else {
      throw new Error("No file path or buffer provided for upload");
    }

    if (filePath) removeLocalFile(filePath);

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.secure_url,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    if (filePath) removeLocalFile(filePath);
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
          secure_url: result.secure_url,
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

/* ===================== DELETE (flexible) ===================== */
const deleteFile = async (publicIdOrObj, resourceTypeArg) => {
  const isObj = publicIdOrObj && typeof publicIdOrObj === "object";
  const publicId = isObj ? publicIdOrObj.publicId : publicIdOrObj;
  const resourceType =
    (isObj ? publicIdOrObj.resourceType : resourceTypeArg) || "image";

  if (!publicId) return null;
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

module.exports = { uploadFile, uploadBuffer, deleteFile };
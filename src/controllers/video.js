const path = require("node:path");
const fs = require("node:fs").promises;
const crypto = require("node:crypto");
const { pipeline } = require("node:stream/promises");

const db = require("../DB");
const util = require("../lib/utils");

const uploadVideo = async (req, res, handleErr) => {
  const specifiedFileName = req.headers.filename;
  const extension = path.extname(specifiedFileName).substring(1);
  const filename = path.parse(specifiedFileName).name;
  const videoId = crypto.randomBytes(5).toString("hex");
  try {
    await fs.mkdir(`./storage/${videoId}`);
    const fullPath = `./storage/${videoId}/orignal.${extension}`;
    const fileHandler = await fs.open(fullPath, "w");
    const fileStream = fileHandler.createWriteStream();

    await pipeline(req, fileStream);
    db.update();
    db.videos.unshift({
      id: db.videos.length,
      videoId,
      name: filename,
      extension,
      userId: req.userId,
      extractedAudio: false,
      resizes: {},
    });
    db.save();

    res.status(200).json({
      status: "success",
      message: "The file was uploaded successfully",
    });
  } catch (e) {
    util.deleteFolder(`./storage/${videoId}`);
    if (e.code !== "ECONNRESET") return handleErr(e);
  }
};

const Video = { uploadVideo };
module.exports = Video;

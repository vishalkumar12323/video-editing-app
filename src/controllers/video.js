const path = require("node:path");
const crypto = require("node:crypto");
const fs = require("node:fs").promises;
const { pipeline } = require("node:stream").promises;

const db = require("../DB");
const util = require("../lib/utils");
const videoService = require("../lib/videoService");

const getVideo = (req, res, handleErr) => {
  db.update();
  const videos = db.videos.filter((video) => {
    return video.userId === req.userId;
  });

  res.status(200).json(videos);
};

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
    const thumbnailPath = `./storage/${videoId}/thumbnail.jpg`;

    await pipeline(req, fileStream);

    await videoService.makeThumbnail(fullPath, thumbnailPath);

    const dimensions = await videoService.getDimensions(thumbnailPath);

    db.update();
    db.videos.unshift({
      id: db.videos.length,
      videoId,
      name: filename,
      extension,
      dimensions,
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

const Video = { uploadVideo, getVideo };
module.exports = Video;

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

const getVideoAsset = async (req, res, handleErr) => {
  const videoId = req.params.get("videoId");
  const type = req.params.get("type");
  console.log(videoId, " TTY ", type);

  db.update();
  const video = db.videos.find((v) => v.videoId === videoId);

  if (!video) {
    handleErr({
      status: 404,
      message: "video not found.",
    });
  }

  let file;
  let mimeType;
  try {
    switch (type) {
      case "thumbnail": {
        file = await fs.open(`./storage/${videoId}/thumbnail.jpg`, "r");
        mimeType = "image/jpeg";
        break;
      }
      case "audio": {
        break;
      }
      case "resize": {
        break;
      }
    }

    const stat = await file.stat();
    const fileStream = file.createReadStream();
    res.setHeader("Contant-Type", mimeType);
    res.setHeader("Contant-Length", stat.size);
    res.status(200);
    await pipeline(fileStream, res);
    await file.close();
  } catch (e) {
    console.log(e);
    handleErr(e);
  }
};
const Video = { uploadVideo, getVideo, getVideoAsset };
module.exports = Video;

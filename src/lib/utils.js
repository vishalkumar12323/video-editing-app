const path = require("node:path");
const fs = require("node:fs/promises");

const util = {};

util.deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (e) {}
};
util.deleteFolder = async (folderPath) => {
  try {
    await fs.rm(folderPath, { recursive: true });
  } catch (e) {}
};

module.exports = util;

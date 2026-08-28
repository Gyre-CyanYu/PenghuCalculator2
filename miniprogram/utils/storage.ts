async function downloadImage(url: string, fileID: string, cachedUrl?: string): Promise<string> {
  const timestamp: string = url.split('?t=')[1];
  const fileIDParts: string[] = fileID.split('/');

  const id: string = fileIDParts[4].split('.')[0];
  const imageType = fileIDParts[3].slice(0, -1) as ImageType;

  const fs = wx.getFileSystemManager();

  if (cachedUrl && !cachedUrl.startsWith('https://')) {
    try {
      fs.accessSync(cachedUrl);
      const cachedTimestamp: string = cachedUrl.split('?t=')[1];

      if (timestamp === cachedTimestamp) {
        return cachedUrl
      }
    } catch (err) {}
  }

  try {
    const dirPath: string = `${wx.env.USER_DATA_PATH}/${imageType}`;

    try {
      fs.accessSync(dirPath);
    } catch (err) {
      fs.mkdirSync(dirPath);
    }

    const { tempFilePath } = await wx.cloud.downloadFile({ fileID });
    const savedFilePath: string = `${dirPath}/${id}.jpg`;

    fs.saveFileSync(tempFilePath, savedFilePath);
    return savedFilePath + '?t=' + timestamp
  } catch (err) {
    console.error(`下载${imageType}图像${id}失败`, err);
    return url
  }
};

function removeImage(imageType: ImageType, idList: string[]): void {
  const fs = wx.getFileSystemManager();
  const dirPath: string = `${wx.env.USER_DATA_PATH}/${imageType}`;

  try {
    fs.accessSync(dirPath);
  } catch (err) {
    return
  }

  const fileList = fs.readdirSync(dirPath);
  fileList.forEach(file => {
    const id: string = file.split('.')[0];

    if (idList.includes(id)) {
      fs.unlink({ filePath: `${dirPath}/${file}`, fail: err => {
        console.warn(`清除${imageType}图像${id}失败`, err);
      }});
    }
  });
};

export default{ downloadImage, removeImage };
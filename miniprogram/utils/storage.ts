async function cacheImage(fileID: string, currentUrl: string, cachedSrc?: string): Promise<string> {
  const fs = wx.getFileSystemManager();
  const timestamp: string = currentUrl.split('?t=')[1];

  if (cachedSrc?.startsWith(wx.env.USER_DATA_PATH)) {
    try {
      fs.accessSync(cachedSrc);
      
      const cachedTimestamp: string = cachedSrc.split('?t=')[1];

      if (timestamp === cachedTimestamp) {
        return cachedSrc
      }
    } catch (err) {}
  }
  
  const fileIDParts: string[] = fileID.split('/');
  const imageType = fileIDParts[3].slice(0, -1) as ImageType;
  const id: string = fileIDParts[4].split('.')[0];

  const dirPath: string = `${wx.env.USER_DATA_PATH}/${imageType}s`;

  try {
    fs.accessSync(dirPath);
  } catch (err) {
    fs.mkdirSync(dirPath);
  }
  
  try {
    const { tempFilePath } = await wx.cloud.downloadFile({ fileID });
    const savedFilePath: string = `${dirPath}/${id}.jpg?t=${timestamp}`;
    fs.saveFileSync(tempFilePath, savedFilePath);

    return savedFilePath
  } catch (err) {
    console.error(`下载${imageType}图像${id}失败`, err);
    return fileID
  }
};

function removeImage(fileIDList: string[]): void {
  const imageType = fileIDList[0].split('/')[3].slice(0, -1) as ImageType;
  const idList: string[] = fileIDList.map(fileID => fileID.split('/')[4].split('.')[0]);
  const dirPath: string = `${wx.env.USER_DATA_PATH}/${imageType}s`;
  const fs = wx.getFileSystemManager();

  try {
    fs.accessSync(dirPath);
  } catch (err) {
    return
  }

  const fileList = fs.readdirSync(dirPath);
  fileList.forEach(file => {
    const id: string = file.split('.')[0];

    if (idList.includes(id)) {
      fs.unlink({
        filePath: `${dirPath}/${file}`,
        fail: err => console.warn(`清除${imageType}图像${id}失败`, err)
      });
    }
  });
};

export default{ cacheImage, removeImage };
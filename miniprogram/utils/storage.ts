const { mergeWith } = require('lodash');

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

async function removeImage(imageType: ImageType, idList: string[]): Promise<void> {
  const fs = wx.getFileSystemManager();
  const dirPath: string = `${wx.env.USER_DATA_PATH}/${imageType}`;

  try {
    fs.accessSync(dirPath);
  } catch (err) {
    return
  }

  const fileList = fs.readdirSync(dirPath);

  await Promise.all(fileList.map(file => {
    const id: string = file.split('.')[0];

    if (idList.includes(id)) {
      try {
        fs.unlinkSync(`${dirPath}/${file}`);
      } catch (err) {
        console.warn(`删除${imageType}图像${id}失败`, err);
      }
    }
  }));
};

function cacheUserData(userData: UserData): void {
  const cachedUserDataList: UserData[] = wx.getStorageSync('users') || [];
  const cachedUserDataIndex: number = cachedUserDataList.findIndex(cachedUserData => cachedUserData.openid === userData.openid);
  
  if (cachedUserDataIndex === -1) {
    cachedUserDataList.push(userData);
  } else {
    cachedUserDataList[cachedUserDataIndex] = userData;
  }
  
  wx.setStorageSync('users', cachedUserDataList);
};

function cacheRoomData(roomData: RoomData): void {
  const cachedRoomDataList: RoomData[] = wx.getStorageSync('rooms') || [];
  const cachedRoomDataIndex: number = cachedRoomDataList.findIndex(cachedRoomData => cachedRoomData.roomid === roomData.roomid);

  if (cachedRoomDataIndex === -1) {
    cachedRoomDataList.push(roomData);
  } else {
    const cachedRoomData: RoomData = cachedRoomDataList[cachedRoomDataIndex];
    
    cachedRoomDataList[cachedRoomDataIndex] = mergeWith(cachedRoomData, roomData, (objValue: any, srcValue: any) => {
      if (Array.isArray(objValue)) {
        return srcValue;
      }
    });
  }

  wx.setStorageSync('rooms', cachedRoomDataList);
};

export default{ downloadImage, removeImage, cacheUserData, cacheRoomData };
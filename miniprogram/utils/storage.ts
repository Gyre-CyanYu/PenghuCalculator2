const { mergeWith } = require('lodash');

async function downloadImage(downloadUrl: string, imageType: ImageType, id: string, currentUrl?: string): Promise<string> {
    try {
        const fs = wx.getFileSystemManager();
        const dirPath: string = `${wx.env.USER_DATA_PATH}/${imageType}`;

        try {
            fs.accessSync(dirPath);
        } catch (err) {
            fs.mkdirSync(dirPath);
        }

        const fileList = fs.readdirSync(dirPath);
        let fileName: string = `${id}.jpg`;

        if (imageType === 'avatar') {
            fileName = downloadUrl.split('/').pop() as string;

            if (currentUrl) {
                if (!currentUrl.startsWith('https://') && currentUrl.split('/').pop() === fileName) {
                    return currentUrl
                }
            } else {
                const cachedFileName: string | undefined = fileList.find(file => file === fileName);

                if (cachedFileName) {
                    return `${dirPath}/${cachedFileName}`
                }
            }
        } else {
            if (currentUrl) {
                if (!currentUrl.startsWith('https://')) {
                    return currentUrl
                }
            } else {
                const cachedFileName: string | undefined = fileList.find(file => file === fileName);

                if (cachedFileName) {
                    return `${dirPath}/${cachedFileName}`
                }
            }
        }

        const { tempFilePath } = await new Promise((resolve, reject) => {
            wx.downloadFile({
                url: downloadUrl,
                success: resolve,
                fail: reject
            });
        }) as { tempFilePath: string };

        const savedFilePath: string = `${dirPath}/${fileName}`;
        fs.saveFileSync(tempFilePath, savedFilePath);

        try {
            fileList.forEach(file => {
                if (file.startsWith(id) && file !== fileName) {
                    fs.unlinkSync(`${dirPath}/${file}`);
                }
            });
        } catch (err) {
            console.warn(`删除${imageType}旧图像${id}失败`, err);
        }

        return savedFilePath
    } catch (err) {
        console.error(`下载${imageType}图像${id}失败`, err);
        return downloadUrl
    }
};

async function removeImage(imageType: ImageType, reservedIdList: string[] = []): Promise<void> {
    const fs = wx.getFileSystemManager();
    const dirPath: string = `${wx.env.USER_DATA_PATH}/${imageType}`;

    try {
        fs.accessSync(dirPath);
    } catch (err) {
        return
    }

    const fileList = fs.readdirSync(dirPath);

    await Promise.all(fileList.map(file => {
        let id: string = file.split('.')[0];

        if (imageType === 'avatar') {
            id = file.substring(0, file.lastIndexOf('_'));
        }

        if (!reservedIdList.includes(id)) {
            try {
                fs.unlinkSync(`${dirPath}/${file}`);
            } catch (err) {
                console.warn(`删除${imageType}图像${file}失败`, err);
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
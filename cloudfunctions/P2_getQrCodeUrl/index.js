// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event) => {
  const db = cloud.database();
  const { roomid } = event;

  try {
    const { data } = await db.collection('rooms').where({ roomid }).field({
      qrCodeUrl: true,
      isGamePlaying: true
    }).get();
    
    if (data.length < 1) {
      return {
        code: 404,
        data: null,
        message: '房间不存在'
      };
    }

    let { qrCodeUrl, isGamePlaying } = data[0];

    if (isGamePlaying === -1) {
      return {
        code: 403,
        data: null,
        message: '房间已结算'
      }
    }

    if (!qrCodeUrl) {
      const { buffer } = await cloud.openapi.wxacode.getUnlimited({ scene: `roomid=${ roomid }` });

      const { fileID } = await cloud.uploadFile({
        cloudPath: `qrCodes/${roomid}.jpg`,
        fileContent: buffer
      });

      const { fileList } = await cloud.getTempFileURL({ fileList: [fileID] });
      qrCodeUrl = fileList[0].tempFileURL;

      await db.collection('rooms').where({ roomid }).update({ data: { qrCodeUrl } });
    }

    return {
      code: 200,
      data: qrCodeUrl,
      message: '已获取二维码'
    }
  } catch (err) {
    console.error(err);
    return {
      code: 500,
      data: null,
      message: '服务器错误'
    }
  }
}
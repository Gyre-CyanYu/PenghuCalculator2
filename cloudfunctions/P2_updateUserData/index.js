// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  const { avatarFileID, nickname } = event;

  try {
    const updateData = {};

    if (avatarFileID) {
      const { fileList } = await cloud.getTempFileURL({ fileList: [avatarFileID] });

      updateData.avatarUrl = fileList[0].tempFileURL + '?t=' + Date.now();
      updateData.avatarFileID = avatarFileID;
    }

    if (nickname) {
      if (nickname.length > 5) {
        return {
          code: 403,
          data: null,
          message: '昵称长度不能超过5个字符'
        }
      }

      updateData.nickname = nickname;
    }

    await db.collection('users').where({ _openid: openid }).update({ data: updateData });

    return {
      code: 200,
      data: updateData,
      message: '更新资料成功'
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
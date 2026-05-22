// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  const { avatarFileID, nickname } = event;

  try {
    const userData = { openid };

    if (avatarFileID) {
      const { fileList } = await cloud.getTempFileURL({ fileList: [avatarFileID] });

      userData.avatarUrl = fileList[0].tempFileURL + '?t=' + Date.now();
      userData.avatarFileID = avatarFileID;
    }

    if (nickname) {
      userData.nickname = nickname;
    }

    await db.collection('users').where({ _openid: openid }).update({ data: userData });

    return {
      code: 200,
      data: userData,
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
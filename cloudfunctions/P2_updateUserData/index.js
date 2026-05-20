// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  const { nickname, avatarArrayBuffer } = event;

  try {
    const userData = {};
    if (nickname) {
      userData.nickname = nickname;
    }

    if (avatarArrayBuffer) {
      const { fileID } = await cloud.uploadFile({
        cloudPath: `avatar/${openid}_${Date.now()}.jpg`,
        fileContent: Buffer.from(avatarArrayBuffer)
      });

      const { fileList } = await cloud.getTempFileURL({ fileList: [fileID] });
      userData.avatarUrl = fileList[0].tempFileURL;

      try {
        const { data } = await db.collection('users').where({ _openid: openid }).field({
          avatarUrl: true
        }).get();
        
        if (data[0]?.avatarUrl) {
          await cloud.deleteFile({ fileList: [fileID.replace(/\/[^\/]*$/, '/' + data[0].avatarUrl.split('/').pop())] });
        }
      } catch (err) {
        console.warn('删除旧用户头像失败', err);
      }
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
      code: err.code || 500,
      message: err.message || '服务器错误'
    }
  }
}
// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  
  try {
    const { data } = await db.collection('users').where({ _openid: openid }).field({
      _openid: true,
      avatarUrl: true,
      avatarFileID: true,
      nickname: true
    }).get();

    if (data.length >= 1) {
      return {
        code: 200,
        data: {
          openid,
          avatarUrl: data[0].avatarUrl,
          avatarFileID: data[0].avatarFileID,
          nickname: data[0].nickname
        },
        message: '已获取用户信息'
      }
    }

    const userData = {
      _openid: openid,
      avatarUrl: '',
      avatarFileID: '',
      nickname: ['碰', '扫', '坎', '跑', '提', '蛇'][Math.floor(Math.random() * 6)] + Date.now().toString().slice(-3),
      createdAt: db.serverDate()
    };

    await db.collection('users').add({ data: userData });

    return {
      code: 201,
      data: {
        openid: userData._openid,
        avatarUrl: userData.avatarUrl,
        avatarFileID: userData.avatarFileID,
        nickname: userData.nickname
      },
      message: '新增用户信息成功'
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
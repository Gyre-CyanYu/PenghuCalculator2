// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event) => {
  const db = cloud.database();
  const _ = db.command;
  const { userList } = event;

  try {
    const { data } = await db.collection('users').where({
      _openid: _.in(userList)
    }).field({
      _openid: true,
      avatarUrl: true,
      avatarFileID: true,
      nickname: true
    }).get();

    const dataMap = {};
    
    data.forEach(userData => {
      dataMap[userData._openid] = userData;
    });

    const userDataList = userList.map(openid => {
      const userData = dataMap[openid];

      if (!userData) {
        return null
      }

      return {
        openid,
        avatarUrl: userData.avatarUrl,
        avatarFileID: userData.avatarFileID,
        nickname: userData.nickname
      }
    }).filter(Boolean);

    return {
      code: 200,
      data: userDataList,
      message: '已获取用户信息列表'
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
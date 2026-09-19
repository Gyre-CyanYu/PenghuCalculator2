// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async () => {
  const openid = cloud.getWXContext().OPENID
  const db = cloud.database();
  const _ = db.command;

  try {
    const { data } = await db.collection('histories').where({
      memberList: _.elemMatch(_.eq(openid))
    }).field({
      roomid: true,
      createdAt: true,
      settledAt: true,

      gameConfig: true,

      memberList: true,
      scoresMap: true,

      round: true
    }).orderBy('createdAt', 'desc').get()

    if (data.length < 1) {
      return { 
        code: 204, 
        data, 
        message: '历史记录信息为空' 
      }
    }

    return {
      code: 200,
      data,
      message: '已获取历史记录信息列表'
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
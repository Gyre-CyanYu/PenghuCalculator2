// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  const _ = db.command;

  try {
    const { data } = await db.collection('rooms').where({
      memberList: _.elemMatch(_.eq(openid)),
      isGamePlaying: _.neq(-1)
    }).field({ roomid: true }).orderBy('createdAt', 'desc').get();

    return {
      code: 200,
      data: data.map(roomData => roomData.roomid),
      message: '已获取已加入房间列表'
    };
  } catch (err) {
    console.error(err);
    return {
      code: 500,
      data: null,
      message: '服务器错误'
    };
  }
}
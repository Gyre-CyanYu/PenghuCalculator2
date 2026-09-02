// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  const { roomid, nextDealer } = event;

  try {
    const { data } = await db.collection('rooms').where({ roomid }).field({
      isGamePlaying: true,
      
      nextPlayerTuple: true,
      nextDealer: true
    }).get();

    if (data.length < 1) {
      return {
        code: 404,
        data: null,
        message: '房间不存在'
      };
    }

    const {
      isGamePlaying,
      nextPlayerTuple, nextDealer: currentNextDealer
    } = data[0];

    if (isGamePlaying === -1) {
      return {
        code: 403,
        data: null,
        message: '房间已结算'
      }
    } else if (isGamePlaying === 1) {
      return {
        code: 403,
        data: null,
        message: '对局已开始'
      }
    }

    if (currentNextDealer !== openid) {
      return {
        code: 403,
        data: null,
        message: '非庄家无法转让'
      }
    }

    if (!nextPlayerTuple.filter(Boolean).includes(nextDealer)) {
      return {
        code: 403,
        data: null,
        message: '受让者不是玩家'
      }
    }

    await db.collection('rooms').where({ roomid }).update({ data: { nextDealer } });

    return {
      code: 200,
      data: null,
      message: '更新下局庄家成功'
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
// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  const { roomid, isRandomBack } = event;

  try {
    const { data } = await db.collection('rooms').where({ roomid }).get();

    if (data.length < 1) {
      return {
        code: 404,
        data: null,
        message: '房间不存在'
      };
    }

    const {
      isGamePlaying,
      nextPlayerTuple, isRandomBackMap
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

    if (nextPlayerTuple.filter(Boolean).includes(openid)) {
      return {
        code: 403,
        message: '玩家不允许砸鸟'
      }
    }

    isRandomBackMap[openid] = isRandomBack;

    await db.collection('rooms').where({ roomid }).update({
      data: { isRandomBackMap }
    });

    return {
      code: 200,
      data: null,
      message: '更新随机砸鸟信息成功'
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
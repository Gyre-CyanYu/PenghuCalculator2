// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  const _ = db.command;
  const roomid = event.roomid;

  try {
    const { data } = await db.collection('rooms').where({ roomid }).get();

    if (data.length < 1) {
      return {
        code: 404,
        data: null,
        message: '房间不存在'
      };
    }

    const { memberList, isGamePlaying } = data[0];

    if (isGamePlaying === -1) {
      return {
        code: 403,
        data: null,
        message: '房间已结算'
      }
    }

    if (memberList.includes(openid)) {
      return {
        code: 200,
        data: null,
        message: '用户已在房间中'
      };
    }

    const { total } = await db.collection('rooms').where({
      memberList: _.elemMatch(_.eq(openid)),
      isGamePlaying: _.neq(-1)
    }).count();

    if (total >= 8) {
      return {
        code: 403,
        data: null,
        message: '最多加入8个房间'
      };
    }

    if (memberList.length >= 16) {
      return {
        code: 403,
        data: null,
        message: '房间已满'
      };
    }

    await db.collection('rooms').where({ roomid }).update({
      data: {
        memberList: _.push(openid),
        [`scoresMap.${openid}`]: 0,
        [`roundScoresMap.${openid}`]: 0
      }
    })

    return {
      code: 201,
      data: null,
      message: '加入房间成功'
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
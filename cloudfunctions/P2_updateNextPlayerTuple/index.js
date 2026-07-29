// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  const { roomid, seat } = event;
  
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
      nextPlayerTuple, nextBackerMap, nextDealer,
      isRandomBackMap
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

    const currentSeat = nextPlayerTuple.findIndex(nextPlayer => nextPlayer === openid);

    if (currentSeat === -1) {
      if (seat === -1) {
        return {
          code: 200,
          data: null,
          message: '已位于旁观'
        }
      }
    } else if (currentSeat === seat) {
      return {
        code: 200,
        data: null,
        message: '已位于该位置'
      }
    } else {
      nextPlayerTuple[currentSeat] = '';
    }

    if ([0, 1, 2, 3].includes(seat)) {
      if (nextPlayerTuple[seat]) {
        return {
          code: 403,
          data: null,
          message: '该位置已有玩家'
        }
      }

      const backedPlayer = Object.keys(nextBackerMap).find(target => 
        nextBackerMap[target].includes(openid)
      ) ?? '';

      if (backedPlayer || isRandomBackMap[openid]) {
        return {
          code: 403,
          data: null,
          message: '请先取消砸鸟'
        }
      }

      nextPlayerTuple[seat] = openid;
    } else {
      if (nextDealer === openid) {
        return {
          code: 403,
          data: null,
          message: '请先转让庄家'
        }
      }

      if (nextBackerMap[openid]?.length > 0) {
        return {
          code: 403,
          data: null,
          message: '被砸鸟时不能旁观'
        }
      }
    }

    await db.collection('rooms').where({ roomid }).update({
      data: { nextPlayerTuple }
    });

    return {
      code: 200,
      data: null,
      message: '更新下局玩家成功'
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
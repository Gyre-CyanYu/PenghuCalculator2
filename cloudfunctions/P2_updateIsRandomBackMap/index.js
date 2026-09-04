// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  const _ = db.command;
  const { roomid, isRandomBack } = event;

  try {
    const { data } = await db.collection('rooms').where({ roomid }).field({
      isGamePlaying: true,
      
      nextPlayerTuple: true,
      nextBackerMap: true,
      isRandomBackMap: true
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
      nextPlayerTuple, nextBackerMap, isRandomBackMap
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

    if (nextPlayerTuple.filter(Boolean).length !== 4) {
      return {
        code: 403,
        message: '请等待所有玩家加入'
      }
    }

    const updateData = { [`isRandomBackMap.${openid}`]: isRandomBack };

    if (isRandomBack) {
      const target = nextPlayerTuple[new Date().getTime() % 4];
      const currentTarget = Object.keys(nextBackerMap).find(target => 
        nextBackerMap[target].includes(openid)
      ) ?? '';

      if (currentTarget !== target) {
        if (currentTarget) {
          updateData[`nextBackerMap.${currentTarget}`] = _.pull(openid);
        }

        updateData[`nextBackerMap.${target}`] = _.push(openid);
      }
    }

    await db.collection('rooms').where({ roomid }).update({ data: updateData });

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
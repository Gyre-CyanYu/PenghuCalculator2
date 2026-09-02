// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  const { roomid, target } = event;

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
        data: null,
        message: '玩家不允许砸鸟'
      }
    }

    if (isRandomBackMap[openid]) {
      return {
        code: 403,
        data: null,
        message: '已选择随机砸鸟'
      }
    }

    if (!nextPlayerTuple.filter(Boolean).includes(target)) {
      return {
        code: 403,
        data: null,
        message: '被砸鸟者不是玩家'
      }
    }

    const currentTarget = Object.keys(nextBackerMap).find(target => 
      nextBackerMap[target].includes(openid)
    ) ?? '';

    if (currentTarget) {
      nextBackerMap[currentTarget].splice(nextBackerMap[currentTarget].indexOf(openid), 1);
    }

    if (currentTarget !== target) {
      if (!nextBackerMap[target]) {
        nextBackerMap[target] = [];
      }

      nextBackerMap[target].push(openid);
    }

    await db.collection('rooms').where({ roomid }).update({ data: { nextBackerMap } });

    return {
      code: 200,
      data: null,
      message: '更新下局砸鸟列表成功'
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
// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async () => {
  const db = cloud.database();
  const _ = db.command;
  const ageLimit = db.serverDate({ offset: -12 * 60 * 60 * 1000 });
  
  try {
    const { data } = await db.collection('rooms').where(_.and([
      { 'createdAt': _.lt(ageLimit) },

      _.or([
        { 'isTest': _.exists(false).or(_.eq(false)) },
        { 'isGamePlaying': _.eq(-1) }
      ])
    ])).get();

    const results = await Promise.all(data.map(({ roomid, isGamePlaying }) =>
      (async () => {
        if (isGamePlaying !== -1) {
          const { result } = await cloud.callFunction({
            name: 'recordAction',
            data: {
              roomid,
              func: 'settleGame',
              param: {}
            }
          });

          if (![200, 201].includes(result.code)) {
            throw result
          }
        }

        await db.collection('rooms').where({ roomid }).remove();
        return true;
      })().catch(err => {
        console.warn(`结算房间${roomid}时发生错误`, err);
        return false;
      })
    ));

    const count = results.filter(Boolean).length;
    
    return {
      code: 200,
      data: null,
      message: `查找到${data.length}个房间，成功结算${count}个房间`,
    }
  } catch (err) {
    console.error(err)
    return {
      code: 500,
      data: null,
      message: '服务器错误'
    }
  }
}
// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  const _ = db.command;
  
  const gameConfig = {
    mode: 'addition',
    limit: 4,
    fiveTriWinConsiderHoldDealer: true,
    heavenWinConsiderHoldDealer: true,
    ...event.gameConfig
  };

  try {
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

    let count = 0
    let roomid;

    while (count < 5) { 
      roomid = Math.random().toString(36).slice(2, 7);
      const transaction = await db.startTransaction();

      try {
        const { data } = await transaction.collection('rooms').where({ roomid }).get();
        if (data.length !== 0) {
          await transaction.rollback();
          count ++;
          continue;
        }

        const roomData = {
          roomid,
          qrCodeUrl: '',
          createBy: openid,
          createdAt: db.serverDate(),

          gameConfig,
          
          memberList: [openid],
          actionDataList: [],
          scoresMap: {[openid]: 0},

          isGamePlaying: 0,
          round: 0,

          playerList: [],
          backerMap: {},
          dealer: '',
          holdDealer: 1,

          roundScoresMap: {[openid]: 0},
          tripletMap: {},
          winner: '',

          nextPlayerMap: {0: '', 1: '', 2: '', 3: ''},
          nextBackerMap: {},
          nextDealer: '',

          isRandomBackMap: {}
        };

        await transaction.collection('rooms').add({ data: roomData });
        await transaction.commit();
        break;
      } catch (err) {
        await transaction.rollback();
        count++;
        continue;
      }
    }

    if (count >= 5) {
      return {
        code: 503,
        data: null,
        message: '服务器繁忙'
      }
    }

    return {
      code: 201,
      data: roomid,
      message: '房间创建成功'
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
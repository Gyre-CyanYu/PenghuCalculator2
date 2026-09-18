// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event) => {
  const db = cloud.database();
  const _ = db.command;
  const { roomid } = event;

  try {
    const { code, data: qrCodeFileID, message } = await db.runTransaction(async transaction => {
      const { total } = await transaction.collection('histories').where({ roomid }).count();

      if (total) {
        return {
          code: 200,
          data: null,
          message: '房间已结算'
        }
      }

      const { data } = await transaction.collection('rooms').where({ roomid }).field({
        qrCodeFileID: true,
        createBy: true,
        createdAt: true,

        gameConfig: true,

        memberList: true,
        actionDataList: true,
        scoresMap: true,

        isGamePlaying: true,
        round: true,

        dealer: true,

        roundScoresMap: true
      }).get();

      if (data.length < 1) {
        return {
          code: 404,
          data: null,
          message: '房间不存在'
        }
      }

      const {
        qrCodeFileID, createBy, createdAt,
        gameConfig,
        memberList, actionDataList, scoresMap,
        isGamePlaying, round,
        dealer,
        roundScoresMap
      } = data[0];

      const updateData = { isGamePlaying: -1 };

      if (isGamePlaying === 1) {
        memberList.filter(member => roundScoresMap[member]).forEach(member => {
          scoresMap[member] += roundScoresMap[member];
          updateData[`scoresMap.${member}`] = _.inc(roundScoresMap[member]);
        });

        updateData['holdDealer'] = 1;
        updateData['winner'] = '';
        updateData['nextDealer'] = dealer;
      }

      const historyData = {
        roomid,
        createBy,
        createdAt,
        settledAt: db.serverDate(),

        gameConfig,

        memberList,
        actionDataList,
        scoresMap,

        round
      };

      await Promise.all([
        transaction.collection('rooms').where({ roomid }).update({ data: updateData }),
        transaction.collection('histories').add({ data: historyData })
      ]);

      return {
        code: 201,
        data: qrCodeFileID,
        message: '结算房间成功'
      }
    });

    if (code === 201 && qrCodeFileID) {
      try {
        await cloud.deleteFile({ fileList: [qrCodeFileID] })
      } catch (err) {
        console.warn(`清除房间${roomid}的小程序码时发生错误`, err);
      }
    }

    return {
      code,
      data: null,
      message
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
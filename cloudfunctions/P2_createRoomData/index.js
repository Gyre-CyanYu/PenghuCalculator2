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

    while (count < 3) { 
      roomid = Math.random().toString(36).slice(2, 7);

      const { total: beforeRoomCount } = await db.collection('rooms').where({ roomid }).count();

      if (beforeRoomCount !== 0) {
        count ++;
        continue
      }

      const roomData = {
        roomid,
        qrCodeUrl: '',
        qrCodeFileID: '',
        createBy: openid,
        createdAt: db.serverDate(),

        gameConfig,
        
        memberList: [openid],
        actionDataList: [],
        scoresMap: {[openid]: 0},

        isGamePlaying: -1,
        round: 0,

        playerList: [],
        backerMap: {},
        dealer: '',
        holdDealer: 1,

        roundScoresMap: {[openid]: 0},
        tripletMap: {},
        winner: '',

        nextPlayerTuple: [openid, '', '', ''],
        nextBackerMap: {},
        nextDealer: openid,

        isRandomBackMap: {}
      };

      const { _id } = await db.collection('rooms').add({ data: roomData });
      const { total: afterRoomCount } = await db.collection('rooms').where({ roomid }).count();

      if (afterRoomCount !== 1) {
        await db.collection('rooms').doc(_id).remove();
        count ++;
        continue
      }

      const { buffer } = await cloud.openapi.wxacode.getUnlimited({ scene: roomid });

      const { fileID: qrCodeFileID } = await cloud.uploadFile({
        cloudPath: `qrCodes/${roomid}.jpg`,
        fileContent: buffer
      });

      const { fileList } = await cloud.getTempFileURL({ fileList: [qrCodeFileID] });
      const qrCodeUrl = fileList[0].tempFileURL + '?t=' + Date.now();

      await db.collection('rooms').doc(_id).update({ data: {
        qrCodeUrl,
        qrCodeFileID,
        isGamePlaying: 0
      } });

      break
    }

    if (count >= 3) {
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
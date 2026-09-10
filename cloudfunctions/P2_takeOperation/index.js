// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const BASE_POINTS = {
  '碰': 1,
  '扫': 2,
  '坎': 2,

  '跑': 4,
  '提': 8,
  '蛇': 10,
  
  '胡': 4,
  '臭庄': 0,

  '天胡': 20,
  '地胡': 8,
  
  '七对': 40,
  '双龙': 40
};

const COMPOUND_OPERATION = {
  '碰胡': ['碰', '胡'],
  '扫胡': ['扫', '胡'],
  '跑胡': ['跑', '胡'],
  '提龙连胡': ['提', '胡']
};

const END_OPERATION = [
  '胡', '碰胡', '扫胡', '跑胡', '提龙连胡',
  '地胡', '天胡', '七对', '双龙', '臭庄'
];

const TRIPLET_OPERATION = {
  '碰': {3: '碰三大', 4: '碰四清', 5: '五福'},
  '扫': {3: '扫三大', 4: '扫四清', 5: '五福'},
  '坎': {3: '坎三大', 4: '坎四清', 5: '五福'},
  '碰胡': {3: '碰三大连胡', 4: '碰四清连胡', 5: '五福'},
  '扫胡': {3: '扫三大连胡', 4: '扫四清连胡', 5: '五福'},
};

const OPERATION_LIST = [
  ...Object.keys(BASE_POINTS),
  ...Object.keys(COMPOUND_OPERATION)
];

// 云函数入口函数
exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const db = cloud.database();
  const _ = db.command;
  const { roomid, actionName } = event;
  let { payer = null } = event;

  try {
    return await db.runTransaction(async transaction => {
      const { data } = await transaction.collection('rooms').where({ roomid }).field({
        gameConfig: true,
        
        memberList: true,
        actionDataList: true,

        isGamePlaying: true,
        round: true,

        playerList: true,
        backerMap: true,
        dealer: true,
        holdDealer: true,

        roundScoresMap: true,
        tripletMap: true,
        winner: true,

        nextPlayerTuple: true,
        nextBackerMap: true,
        nextDealer: true,

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
        gameConfig,
        memberList, actionDataList,
        winner,
        nextPlayerTuple, nextBackerMap,
        isRandomBackMap
      } = data[0];

      let {
        isGamePlaying, round,
        playerList, backerMap, dealer, holdDealer,
        roundScoresMap, tripletMap,
        nextDealer
      } = data[0];

      if (isGamePlaying === -1) {
        return {
          code: 403,
          data: null,
          message: '房间已结算'
        }
      }

      if (nextPlayerTuple.filter(Boolean).length !== 4) {
        return {
          code: 403,
          data: null,
          message: '上桌人数不满足4人'
        }
      }

      if (!nextPlayerTuple.every(nextPlayer => memberList.includes(nextPlayer))) {
        return {
          code: 403,
          data: null,
          message: '有玩家不在房间中'
        }
      }

      for (const nextBacker of Object.values(nextBackerMap).flat()) {
        if (!memberList.includes(nextBacker)) {
          return {
            code: 403,
            data: null,
            message: '有砸鸟者不在房间中'
          }
        }

        if (nextPlayerTuple.includes(nextBacker)) {
          return {
            code: 403,
            data: null,
            message: '砸鸟者不可上桌'
          }
        }
      }

      for (const target of Object.keys(nextBackerMap).filter(target => nextBackerMap[target].length)) {
        if (!nextPlayerTuple.includes(target)) {
          return {
            code: 403,
            data: null,
            message: '被砸鸟者未上桌'
          }
        }
      }

      if (nextDealer && !nextPlayerTuple.includes(nextDealer)) {
        return {
          code: 403,
          data: null,
          message: '庄家未上桌'
        }
      }

      if (!nextPlayerTuple.includes(openid)) {
        return {
          code: 403,
          data: null,
          message: '你未上桌'
        }
      }

      if (payer && !nextPlayerTuple.includes(payer)) {
        return {
          code: 403,
          data: null,
          message: '支付者未上桌'
        }
      }

      if (!OPERATION_LIST.includes(actionName)) {
        return {
          code: 403,
          data: null,
          message: `${actionName}无效`
        }
      }

      const updateData = {};

      // 开始对局
      if (isGamePlaying === 0) {
        isGamePlaying = 1;
        round += 1;

        updateData['isGamePlaying'] = 1;
        updateData['round'] = _.inc(1);

        playerList = nextPlayerTuple;
        backerMap = nextBackerMap;
        dealer = nextDealer;

        updateData['playerList'] = nextPlayerTuple;
        updateData['backerMap'] = nextBackerMap;
        updateData['dealer'] = nextDealer;

        if (winner === nextDealer) {
          holdDealer += 1;
          updateData['holdDealer'] = _.inc(1);
        } else {
          holdDealer = 1;
          updateData['holdDealer'] = 1;
        }

        roundScoresMap = Object.fromEntries(
          memberList.map(member => [member, 0])
        );

        tripletMap = Object.fromEntries(
          playerList.map(player => [player, []])
        );

        updateData['tripletMap'] = tripletMap;

        nextDealer = '';
        updateData['nextDealer'] = '';
      }

      // 分值计算
      // 1.更新参数
      const group = actionDataList.length;

      if (['地胡', '臭庄'].includes(actionName)) {
        payer = dealer;
      } else if (['蛇', ...Object.keys(TRIPLET_OPERATION)].includes(actionName)) {
        tripletMap[openid].push(group);
        updateData['tripletMap'] = tripletMap;

        if (tripletMap[openid].length > 5) {
          throw new Error(`${openid}刻子数无效`);
        }
      }

      // 2.计算过程
      let scores = 0;

      // 2.1动作基础得分
      if (COMPOUND_OPERATION[actionName]) {
        COMPOUND_OPERATION[actionName].forEach(baseActionName => scores += BASE_POINTS[baseActionName]);
      } else {
        scores += BASE_POINTS[actionName];
      }

      // 2.2刻子额外得分
      if (TRIPLET_OPERATION[actionName]) {
        if ([3, 4].includes(tripletMap[openid].length)) {
          scores += 4;
        } else if (tripletMap[openid].length === 5) {
          scores = 40;
        }
      }

      // 2.3连庄额外得分
      if (
        openid === dealer &&
        !['地胡', '七对', '双龙', '臭庄'].includes(actionName) &&
        (tripletMap[openid].length === 5 || END_OPERATION.includes(actionName)) &&
        (tripletMap[openid].length !== 5 || gameConfig.fiveTriWinConsiderHoldDealer) &&
        (actionName !== '天胡' || gameConfig.heavenWinConsiderHoldDealer)
      ) {
        if (actionName === '天胡') {
          scores -= 10;
        }

        if (gameConfig.mode === 'addition') {
          let winPoint = BASE_POINTS['胡'];

          if (!gameConfig.limit || holdDealer < gameConfig.limit) {
            winPoint *= holdDealer - 1;
          } else {
            winPoint *= gameConfig.limit - 1;
          }

          scores += winPoint;
        } else {
          if (!gameConfig.limit || holdDealer < gameConfig.limit) {
            scores *= holdDealer;
          } else {
            scores *= gameConfig.limit;
          }
        }
      }

      // 动作写入
      let displayActionName = actionName;

      if (TRIPLET_OPERATION[actionName] && [3, 4, 5].includes(tripletMap[openid].length)) {
        displayActionName = TRIPLET_OPERATION[actionName][tripletMap[openid].length];
      }

      const payerList = [];
      const receiverList = [openid];

      if (payer) {
        payerList.push(payer);
        scores *= 3;
      } else {
        payerList.push(...playerList.filter(player => player !== openid));
      }

      if (actionName !== '臭庄') {
        payerList.forEach(payer => {
          payerList.push(...backerMap[payer] ?? []);
        });

        receiverList.push(...backerMap[openid] ?? []);
      }

      const newActionDataList = receiverList.map((receiver, receiverIndex) => {
        return payerList.map((payer, payerIndex) => {
          roundScoresMap[payer] -= scores;
          roundScoresMap[receiver] += scores;

          return {
            actionid: group + receiverIndex * payerList.length + payerIndex,
            group,

            isUndo: false,

            payer,
            receiver,

            name: displayActionName,
            scores,
            round,
            time: cloud.database().serverDate()
          }
        })
      }).flat();

      updateData['actionDataList'] = _.push(newActionDataList);
      updateData['roundScoresMap'] = roundScoresMap;

      // 结束对局
      if (END_OPERATION.includes(actionName) || tripletMap[openid].length === 5) {
        memberList.filter(member => roundScoresMap[member]).forEach(member => {
          updateData[`scoresMap.${member}`] = _.inc(roundScoresMap[member]);
        });

        updateData['isGamePlaying'] = 0;

        if (openid !== dealer || actionName === '臭庄') {
          updateData['holdDealer'] = 1;
        }

        updateData['tripletMap'] = {};

        if (actionName === '臭庄') {
          updateData['winner'] = '';
        } else {
          updateData['winner'] = openid;
        }

        Object.keys(isRandomBackMap).filter(member => isRandomBackMap[member]).forEach(member => {
          const target = nextPlayerTuple[Math.floor(Math.random() * 4)];
          const currentTarget = Object.keys(nextBackerMap).find(target => 
            nextBackerMap[target].includes(member)
          ) ?? '';

          if (currentTarget !== target) {
            if (currentTarget) {
              updateData[`nextBackerMap.${currentTarget}`] = _.pull(member);
            }

            updateData[`nextBackerMap.${target}`] = _.push(member);
          }
        });

        updateData['nextDealer'] = openid;
      }

      await transaction.collection('rooms').where({ roomid }).update({ data: updateData });

      return {
        code: 200,
        data: null,
        message: '收取分值成功'
      }
    });
  } catch (err) {
    console.error(err);
    return {
      code: 500,
      data: null,
      message: '服务器错误'
    }
  }
}
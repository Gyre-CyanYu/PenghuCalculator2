import storage from '../../utils/storage';

const app = getApp<IAppOption>();
export {};

type SeatTuple = ['东', '南', '西', '北']

const OPERATION_MAP: Record<OperationInput, OperationDisplay> = {
  '碰': '碰', '扫': '扫', '坎': '坎',
  '跑': '跑', '提': '提', '蛇': '蛇',
  '胡': '胡', '臭': '臭庄',
  '碰胡': '碰胡', '胡碰': '碰胡',
  '扫胡': '扫胡', '胡扫': '扫胡',
  '跑胡': '跑胡', '胡跑': '跑胡',
  '提胡': '提龙连胡', '胡提': '提龙连胡',
  '胡胡': '天胡',
  '坎坎': '七对', '蛇蛇': '双龙',
}

type RoomPageRoomData = Pick<RoomData, Extract<keyof RoomData, keyof RoomPageData>>

interface RoomPageData {
  openid: string,
  roomid: string,

  memberDataList: MemberData[],
  actionGroupList: (ActionGroup | TempActionGroup)[],

  isGamePlaying: number,
  round: number,

  isPlayer: boolean,
  playerDataList: UserData[],
  dealer: string,
  holdDealer: number,

  isNextPlayer: boolean,
  nextPlayerDataTuple: [UserData | {}, UserData | {}, UserData | {}, UserData | {}],
  nextDealer: string,

  watcher: DB.RealtimeListener | null,

  seatTuple: SeatTuple,
  statusButtonDisabled: boolean,

  bottomGroup: string,

  keyboardVisible: boolean,
  keyboardSelectorVisible: boolean,
  isOperationPanel: boolean,
  confirmButtonDisabled: boolean,

  selectedPlayer: string,
  selectedMemberMap: Record<string, boolean>,

  keyboardInput: KeyboardInput,
  keyboardDisplay: KeyboardDisplay
}

Component({
  data: {
    openid: '',
    roomid: '',

    memberDataList: [],
    actionGroupList: [],

    isGamePlaying: 0,
    round: 0,
    
    isPlayer: false,
    playerDataList: [],
    dealer: '',
    holdDealer: 1,

    isNextPlayer: false,
    nextPlayerDataTuple: [{}, {}, {}, {}],
    nextDealer: '',
    
    watcher: null,

    seatTuple: ['东', '南', '西', '北'],
    statusButtonDisabled: true,

    bottomGroup: '',

    keyboardVisible: false,
    keyboardSelectorVisible: false,
    isOperationPanel: true,
    confirmButtonDisabled: true,

    selectedPlayer: '',
    selectedMemberMap: {},

    keyboardInput: '',
    keyboardDisplay: ''
  } as RoomPageData,

  observers: {
    'actionGroupList': function (): void {
      this.scrollToBottom();
    },

    'isGamePlaying': function (): void {
      const statusButtonDisabled: boolean = this.data.isGamePlaying !== 0;
      this.setData({ statusButtonDisabled });

      this.toggleConfirmButtonDisabled();
    },
    
    'playerDataList': function (): void {
      const isPlayer: boolean = this.data.playerDataList.some(playerData => playerData.openid === this.data.openid);
      this.setData({ isPlayer });
    },

    'nextPlayerDataTuple': function (): void {
      const isNextPlayer: boolean = this.data.nextPlayerDataTuple.some(nextPlayerData =>
        'openid' in nextPlayerData && nextPlayerData.openid === this.data.openid
      );
      this.setData({ isNextPlayer });
    },

    'isOperationPanel': function (): void {
      this.toggleConfirmButtonDisabled();
      this.toggleKeyboardSelectorVisible();
    },

    'selectedMemberMap': function (): void {
      this.toggleConfirmButtonDisabled();
    },
    
    'keyboardInput': function (): void {
      this.toggleConfirmButtonDisabled();
      this.handleKeyboardDisplay();
      this.toggleKeyboardSelectorVisible();
    }
  },

  methods: {
    onLoad() {
      this.setData({ openid: app.globalData.userData.openid });
    },

    onShow() {
      wx.setNavigationBarTitle({ title: '房间' + app.globalData.currentRoomid });
      this.setData({ roomid: app.globalData.currentRoomid });
      this.getTabBar().updateRoomid();

      if (this.data.roomid) {
        this.getCachedRoomData();
        this.watchRoomData();
      }
    },

    onReady() {

    },

    onHide() {
      this.closeWatcher();
    },

    onUnload() {

    },

    onPullDownRefresh() {
      if (this.data.roomid) {
        this.watchRoomData();
      }
    },

    onReachBottom() {

    },

    onShareAppMessage() {
      const shareData = {
        title: '碰胡计分器',
        path: '/pages/home/home',
        imageUrl: '/images/PenghuCalculator5_4.jpg'
      }

      if (this.data.roomid) {
        shareData.title += `房间：${ this.data.roomid }`;
        shareData.path += `?roomid=${ this.data.roomid }`;
      }

      return shareData
    },

    getCachedRoomData(): void {
      const cachedRoomData: Partial<RoomData> = wx.getStorageSync('room') || {};

      if (cachedRoomData.roomid !== this.data.roomid) {
        return
      }

      const {
        memberDataList = [],
        actionGroupList = [],

        isGamePlaying = 0,
        round = 0,

        playerDataList = [],
        dealer = '',
        holdDealer = 1,

        nextPlayerDataTuple = [{}, {}, {}, {}],
        nextDealer = ''
      } = cachedRoomData;

      this.setData({
        memberDataList, actionGroupList,
        isGamePlaying, round,
        playerDataList, dealer, holdDealer,
        nextPlayerDataTuple, nextDealer
      });
    },

    async watchRoomData(): Promise<void> {
      try {
        await this.closeWatcher();
        const db = wx.cloud.database();

        const watcher = db.collection('rooms').where({
          roomid: this.data.roomid
        }).watch({
          onChange: async (snapshot) => {
            const docChange = snapshot.docChanges[0];
            const dataType = docChange.dataType;
            const databaseRoomData = docChange.doc as DatabaseRoomData;

            if (dataType === 'init') {
              await this.initializeMemberData(databaseRoomData);
              this.updateActionGroupList(databaseRoomData, true);
              this.initializeGameData(databaseRoomData);
              this.cacheRoomData();
            } else if (dataType === 'update') {
              const updatedFields = docChange.updatedFields!;
              console.log(updatedFields);

              const updatedMember = Object.keys(updatedFields).find(updatedField => updatedField.startsWith('memberList'));

              if (updatedMember) {
                await this.updateMemberData(databaseRoomData, updatedFields[updatedMember]);
                this.cacheRoomData(['memberDataList']);
              }

              const updatedScoresMemberList = Object.keys(updatedFields).filter(
                updatedField => updatedField.startsWith('scoresMap')
              ).map(updatedField => updatedField.replace('scoresMap.', ''));

              if (updatedScoresMemberList.length) {
                this.updateScores(databaseRoomData, updatedScoresMemberList);
                this.cacheRoomData(['memberDataList']);
              }

              const updatedRoundScoresMemberList = Object.keys(updatedFields).filter(
                updatedField => updatedField.startsWith('roundScoresMap')
              ).map(updatedField => updatedField.replace('roundScoresMap.', ''));

              if (updatedRoundScoresMemberList.length) {
                this.updateRoundScores(databaseRoomData, updatedRoundScoresMemberList);
                this.cacheRoomData(['memberDataList']);
              }

              const updatedActionDataList = Object.keys(updatedFields).find(updatedField => updatedField.startsWith('actionDataList'));

              if (updatedActionDataList) {
                this.updateActionGroupList(databaseRoomData);
                this.cacheRoomData(['actionGroupList']);
              }

              if ('isGamePlaying' in updatedFields) {
                this.updateIsGamePlaying(databaseRoomData);
                this.cacheRoomData(['isGamePlaying']);
              }

              if ('round' in updatedFields) {
                this.updateRound(databaseRoomData);
                this.cacheRoomData(['round']);
              }

              if ('playerList' in updatedFields) {
                this.updatePlayerDataList(databaseRoomData);
                this.cacheRoomData(['playerDataList']);
              }

              if ('dealer' in updatedFields) {
                this.updateDealer(databaseRoomData);
                this.cacheRoomData(['dealer']);
              }

              if ('holdDealer' in updatedFields) {
                this.updateHoldDealer(databaseRoomData);
                this.cacheRoomData(['holdDealer']);
              }

              if ('nextPlayerTuple' in updatedFields) {
                this.updateNextPlayerDataTuple(databaseRoomData);
                this.cacheRoomData(['nextPlayerDataTuple']);
              }

              if ('nextDealer' in updatedFields) {
                this.updateNextDealer(databaseRoomData);
                this.cacheRoomData(['nextDealer']);
              }
            }
          },

          onError: (err) => {
            console.warn('监听错误', err);
            wx.showToast({
              title: '加载异常，请刷新重试',
              icon: 'none'
            });
          }
        });

        this.setData({ watcher });
      } catch (err) {
        console.error('开启监听器错误', err);
        wx.showToast({
          title: '加载失败，请刷新重试',
          icon: 'none'
        });
      }
    },

    async closeWatcher(): Promise<void> {
      const watcher = this.data.watcher;

      if (watcher) {
        try {
          await watcher.close();
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch(err) {
          console.warn('关闭监听器错误', err);
        } finally {
          this.setData({ watcher: null });
        }
      }
    },

    async initializeMemberData(databaseRoomData: DatabaseRoomData): Promise<void> {
      const { memberList, scoresMap, roundScoresMap } = databaseRoomData;

      try {
        const { result } = await wx.cloud.callFunction({
          name: 'P2_getUserDataList',
          data: { userList: memberList.filter(member => member !== this.data.openid) }
        }) as CallFunctionResult<ClientDatabaseUserData[]>;
        
        if (result.code !== 200) {
          throw result;
        }

        const databaseUserDataList = result.data;
        const cachedMemberDataList = this.data.memberDataList;
  
        const memberDataList: MemberData[] = await Promise.all(databaseUserDataList.map(async databaseUserData => {
          const memberData: MemberData = {
            openid: databaseUserData.openid,
            avatarSrc: '',
            avatarFileID: databaseUserData.avatarFileID,
            nickname: databaseUserData.nickname,
            scores: scoresMap[databaseUserData.openid],
            roundScores: roundScoresMap[databaseUserData.openid]
          }

          if (databaseUserData.avatarFileID) {
            const cachedAvatarSrc = cachedMemberDataList.find(cachedMemberData => cachedMemberData.openid === databaseUserData.openid)?.avatarSrc ?? '';
            memberData.avatarSrc = await storage.cacheImage(databaseUserData.avatarFileID, databaseUserData.avatarUrl, cachedAvatarSrc);
          } else {
            memberData.avatarSrc = '/images/PenghuCalculator.jpg';
          }

          return memberData
        }));

        memberDataList.unshift({
          ...app.globalData.userData,
          scores: scoresMap[app.globalData.userData.openid],
          roundScores: roundScoresMap[app.globalData.userData.openid]
        });
  
        this.setData({ memberDataList });
      } catch (err) {
        console.error('初始化成员信息列表失败', err);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
    },

    async updateMemberData(databaseRoomData: DatabaseRoomData, openid: string): Promise<void> {
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'P2_getUserDataList',
          data: { userList: [openid] }
        }) as CallFunctionResult<ClientDatabaseUserData[]>;
        
        if (result.code !== 200) {
          throw result;
        }

        const databaseUserData = result.data[0];

        const memberData: MemberData = {
          openid,
          avatarSrc: '',
          avatarFileID: databaseUserData.avatarFileID,
          nickname: databaseUserData.nickname,
          scores: databaseRoomData.scoresMap[openid],
          roundScores: databaseRoomData.roundScoresMap[openid]
        }

        if (databaseUserData.avatarFileID) {  
          memberData.avatarSrc = await storage.cacheImage(databaseUserData.avatarFileID, databaseUserData.avatarUrl);
        } else {
          memberData.avatarSrc = '/images/PenghuCalculator.jpg';
        }

        const memberDataList = this.data.memberDataList;
        memberDataList.push(memberData);

        this.setData({ memberDataList });
      } catch (err) {
        console.error('更新成员信息列表失败', err);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
    },

    updateScores(databaseRoomData: DatabaseRoomData, memberList: string[]): void {
      const { scoresMap } = databaseRoomData;
      const memberDataList = this.data.memberDataList;

      memberList.forEach(member => {
        memberDataList.find(
          memberData => memberData.openid === member
        )!.scores = scoresMap[member];
      });

      this.setData({ memberDataList });
    },

    updateRoundScores(databaseRoomData: DatabaseRoomData, memberList: string[]): void {
      const { roundScoresMap } = databaseRoomData;
      const memberDataList = this.data.memberDataList;

      memberList.forEach(member => {
        memberDataList.find(
          memberData => memberData.openid === member
        )!.roundScores = roundScoresMap[member];
      });

      this.setData({ memberDataList });
    },

    updateActionGroupList(databaseRoomData: DatabaseRoomData, isInit: boolean = false): void {
      const { actionDataList } = databaseRoomData;
      const actionGroupList = isInit ? [] : this.data.actionGroupList;

      const lastActionData = actionGroupList.filter(actionGroup => !actionGroup.isTemp).at(-1)?.actionDataList.at(-1);
      const lastActionid: number = lastActionData?.actionid ?? -1;
      let lastActionRound: number = lastActionData?.round ?? 0;

      actionDataList.slice(lastActionid + 1).forEach(databaseActionData => {
        const {
          actionid, group,
          isUndo,
          payer, receiver,
          name, scores, round
        } = databaseActionData;

        const {
          scores: payerScores, roundScores: payerRoundScores,
          ...payerData
        } = this.data.memberDataList.find(memberData => memberData.openid === payer)!;

        const {
          scores: receiverScores, roundScores: receiverRoundScores,
          ...receiverData
        } = this.data.memberDataList.find(memberData => memberData.openid === receiver)!;
        
        const actionData: ActionData = {
          actionid,
          group,

          isUndo,

          payerData,
          receiverData,

          name,
          scores,
          round
        }

        if (actionid === group) {
          const isNewRound: boolean = round > lastActionRound;

          const actionGroup: ActionGroup = {
            group,
            payerList: [payer],
            receiverList: [receiver],

            isUndo,
            isTemp: false,
            isNewRound,
            totalScores: scores,

            actionDataList: [actionData]
          }

          actionGroupList.push(actionGroup);
          lastActionRound = round;
        } else {
          const actionGroup = actionGroupList.find(actionGroup => actionGroup.group === group && !actionGroup.isTemp)! as ActionGroup;

          if (!actionGroup.payerList.includes(payer)) {
            actionGroup.payerList.push(payer);
          }

          if (!actionGroup.receiverList.includes(receiver)) {
            actionGroup.receiverList.push(receiver);
          }

          if (actionData.isUndo && !actionGroup.isUndo) {
            actionGroup.isUndo = true;

            actionGroup.actionDataList.forEach(actionData => {
              actionData.isUndo = true;
            });
          }

          actionGroup.totalScores += scores;
          actionGroup.actionDataList.push(actionData);
        }
      });

      this.setData({ actionGroupList });
    },

    initializeGameData(databaseRoomData: DatabaseRoomData): void {
      this.updateIsGamePlaying(databaseRoomData);
      this.updateRound(databaseRoomData);

      this.updatePlayerDataList(databaseRoomData);
      this.updateDealer(databaseRoomData);
      this.updateHoldDealer(databaseRoomData);

      this.updateNextPlayerDataTuple(databaseRoomData);
      this.updateNextDealer(databaseRoomData);
    },

    updateIsGamePlaying(databaseRoomData: DatabaseRoomData): void {
      this.setData({ isGamePlaying: databaseRoomData.isGamePlaying });
    },

    updateRound(databaseRoomData: DatabaseRoomData): void {
      this.setData({ round: databaseRoomData.round });
    },

    updatePlayerDataList(databaseRoomData: DatabaseRoomData): void {
      const playerDataList: UserData[] = databaseRoomData.playerList.map(player => {
        const {
          scores, roundScores,
          ...playerData
        } = this.data.memberDataList.find(memberData => memberData.openid === player)!;

        return playerData;
      });
      
      this.setData({ playerDataList });
    },

    updateDealer(databaseRoomData: DatabaseRoomData): void {
      this.setData({ dealer: databaseRoomData.dealer });
    },

    updateHoldDealer(databaseRoomData: DatabaseRoomData): void {
      this.setData({ holdDealer: databaseRoomData.holdDealer });
    },

    updateNextPlayerDataTuple(databaseRoomData: DatabaseRoomData): void {
      const nextPlayerDataTuple = databaseRoomData.nextPlayerTuple.map(nextPlayer => {
        if (!nextPlayer) {
          return {}
        }

        const {
          scores, roundScores,
          ...nextPlayerData
        } = this.data.memberDataList.find(memberData => memberData.openid === nextPlayer)!;
        
        return nextPlayerData
      }) as [UserData | {}, UserData | {}, UserData | {}, UserData | {}];

      this.setData({ nextPlayerDataTuple });
    },

    updateNextDealer(databaseRoomData: DatabaseRoomData): void {
      this.setData({ nextDealer: databaseRoomData.nextDealer });
    },

    cacheRoomData(fieldList?: (keyof RoomPageRoomData)[]): void {
      const cachedRoomData: RoomData = wx.getStorageSync('room') || {};
      const currentRoomData: RoomPageRoomData = {
        roomid: this.data.roomid,

        memberDataList: this.data.memberDataList,
        actionGroupList: this.data.actionGroupList.filter(actionGroup => !actionGroup.isTemp),

        isGamePlaying: this.data.isGamePlaying,
        round: this.data.round,

        playerDataList: this.data.playerDataList,
        dealer: this.data.dealer,
        holdDealer: this.data.holdDealer,

        nextPlayerDataTuple: this.data.nextPlayerDataTuple,
        nextDealer: this.data.nextDealer,
      };

      if (cachedRoomData.roomid !== this.data.roomid) {
        wx.setStorage({ key: 'room', data: currentRoomData }).catch(err => {
          console.warn('缓存房间信息失败', err);
        });
      } else if (fieldList?.length) {
        const updatedRoomData = Object.fromEntries(
          fieldList.map(field => [field, currentRoomData[field]])
        );

        wx.setStorage({
          key: 'room',
          data: { ...cachedRoomData, ...updatedRoomData }
        }).catch(err => {
          console.warn('缓存房间信息失败', err);
        });
      } else {
        wx.setStorage({
          key: 'room',
          data: { ...cachedRoomData, ...currentRoomData }
        }).catch(err => {
          console.warn('缓存房间信息失败', err);
        });
      }
    },

    async handleBePlayer(e: WechatMiniprogram.BaseEvent): Promise<void> {
      this.setData({ statusButtonDisabled: true });

      try {
        const { result } = await wx.cloud.callFunction({
          name: 'P2_updateNextPlayerTuple',
          data: {
            roomid: this.data.roomid,
            seat: e.currentTarget.dataset.seat
          }
        }) as CallFunctionResult<null>;

        if (result.code === 403) {
          wx.showToast({
            title: `${result.message}`,
            icon: 'none'
          });
        } else if (result.code !== 200) {
          throw result
        }
      } catch (err) {
        console.error('切换座位失败', err);
        wx.showToast({
          title: '切换座位失败',
          icon: 'error'
        });
      }

      this.setData({ statusButtonDisabled: false });
    },

    handleConfirm(): void {
      if (this.data.isOperationPanel) {
        this.takeOperation();
      } else {
        this.transferScores();
      }

      this.closeKeyboard();
    },

    async takeOperation(): Promise<void> {
      const payer: string = this.data.selectedPlayer;
      const actionName = this.data.keyboardDisplay as OperationDisplay;

      const currentActionGroupList = this.data.actionGroupList;
      const group: number = (currentActionGroupList.at(-1)?.actionDataList.at(-1)?.actionid ?? -1) + 1;
      const receiverData: UserData = app.globalData.userData;

      const tempActionGroup: TempActionGroup = {
        group,
        payerList: [],
        receiverList: [this.data.openid],

        isUndo: false,
        isTemp: true,
        isNewRound: false,
        totalScores: 0,

        actionDataList: []
      }

      if (payer) {
        const {
          scores: payerScores, roundScores: payerRoundScores,
          ...payerData
        } = this.data.memberDataList.find(memberData => memberData.openid === payer)!;

        tempActionGroup.payerList.push(payer);
        tempActionGroup.actionDataList.push({
          actionid: group,
          group,

          isUndo: false,

          payerData,
          receiverData,

          name: actionName,
          scores: 0,
          round: this.data.round
        });
      } else {
        this.data.nextPlayerDataTuple.filter(
          nextPlayerData => 'openid' in nextPlayerData
        ).forEach(nextPlayerData => {
          tempActionGroup.payerList.push(nextPlayerData.openid);
          tempActionGroup.actionDataList.push({
            actionid: group,
            group,

            isUndo: false,

            payerData: nextPlayerData,
            receiverData,

            name: actionName,
            scores: 0,
            round: this.data.round
          })
        });
      }

      currentActionGroupList.push(tempActionGroup);
      this.setData({ actionGroupList: currentActionGroupList });

      try {
        const { result } = await wx.cloud.callFunction({
          name: 'P2_takeOperation',
          data: {
            roomid: this.data.roomid,
            payer,
            actionName
          }
        }) as CallFunctionResult<null>;

        if (result.code === 403) {
          wx.showToast({
            title: `${result.message}`,
            icon: 'none'
          });
        } else if (result.code !== 200) {
          throw result
        }
      } catch (err) {
        console.error('收取失败', err);
        wx.showToast({
          title: '收取失败',
          icon: 'error'
        });
      }

      const actionGroupList = this.data.actionGroupList.filter(
        actionGroup => !(actionGroup.group === group && actionGroup.isTemp)
      );

      this.setData({ actionGroupList });
    },

    async transferScores(): Promise<void> {
      const receiverList: string[] = Object.keys(this.data.selectedMemberMap).filter(selectedMember => this.data.selectedMemberMap[selectedMember]);
      const scores: number = Number(this.data.keyboardDisplay) ?? 0;

      const currentActionGroupList = this.data.actionGroupList;
      const group: number = (currentActionGroupList.at(-1)?.actionDataList.at(-1)?.actionid ?? -1) + 1;
      const payerData: UserData = app.globalData.userData;

      const actionDataList: TempActionData[] = receiverList.map((receiver, index) => {
        const {
          scores: receiverScores, roundScores: receiverRoundScores,
          ...receiverData
        } = this.data.memberDataList.find(memberData => memberData.openid === receiver)!;
        
        return {
          actionid: group + index,
          group,

          isUndo: false,

          payerData,
          receiverData,

          name: '支出分值',
          scores: 0,
          round: this.data.round
        }
      });

      const tempActionGroup: TempActionGroup = {
        group,
        payerList: [this.data.openid],
        receiverList,

        isUndo: false,
        isTemp: true,
        isNewRound: false,
        totalScores: 0,

        actionDataList
      }

      currentActionGroupList.push(tempActionGroup);
      this.setData({ actionGroupList: currentActionGroupList });

      try {
        const { result } = await wx.cloud.callFunction({
          name: 'P2_transferScores',
          data: {
            roomid: this.data.roomid,
            receiverList,
            scores
          }
        }) as CallFunctionResult<null>;

        if (result.code === 403) {
          wx.showToast({
            title: `${result.message}`,
            icon: 'none'
          });
        } else if (result.code !== 200) {
          throw result
        }
      } catch (err) {
        console.error('支出失败', err);
        wx.showToast({
          title: '支出失败',
          icon: 'error'
        });
      }

      const actionGroupList = this.data.actionGroupList.filter(
        actionGroup => !(actionGroup.group === group && actionGroup.isTemp)
      );

      this.setData({ actionGroupList });
    },

    async undoAction(e: WechatMiniprogram.CustomEvent): Promise<void> {
      const group: number = Number(e.detail.value);

      const currentActionGroupList = this.data.actionGroupList;
      const newGroup: number = (currentActionGroupList.at(-1)?.actionDataList.at(-1)?.actionid ?? -1) + 1;
      const actionGroup = currentActionGroupList.find(
        actionGroup => actionGroup.group === group && !actionGroup.isTemp
      )!;

      const { payerList, receiverList } = actionGroup;

      const actionDataList: TempActionData[] = actionGroup.actionDataList.map((actionData, index) => {
        const { payerData, receiverData } = actionData;
        const name = '撤回' + actionData.name as UndoActionName;

        return {
          actionid: newGroup + index,
          group: newGroup,

          isUndo: false,

          payerData,
          receiverData,

          name,
          scores: 0,
          round: this.data.round
        }
      });

      const tempActionGroup: TempActionGroup = {
        group: newGroup,
        payerList,
        receiverList,

        isUndo: false,
        isTemp: true,
        isNewRound: false,
        totalScores: 0,

        actionDataList
      }

      currentActionGroupList.push(tempActionGroup);
      this.setData({ actionGroupList: currentActionGroupList });

      try {
        const { result } = await wx.cloud.callFunction({
          name: 'P2_undoAction',
          data: {
            roomid: this.data.roomid,
            group
          }
        }) as CallFunctionResult<null>;

        if (result.code === 403) {
          wx.showToast({
            title: `${result.message}`,
            icon: 'none'
          });
        } else if (result.code !== 200) {
          throw result
        }
      } catch (err) {
        console.error('撤回失败', err);
        wx.showToast({
          title: '撤回失败',
          icon: 'error'
        });
      }

      const actionGroupList = this.data.actionGroupList.filter(
        actionGroup => !(actionGroup.group === newGroup && actionGroup.isTemp)
      );

      this.setData({ actionGroupList });
    },

    scrollToBottom(): void {
      const bottomGroup: string = 'index' + (this.data.actionGroupList.length - 1);
      this.setData({ bottomGroup });
    },

    toggleConfirmButtonDisabled(): void {
      let confirmButtonDisabled: boolean = true;

      if (this.data.isGamePlaying !== -1 && this.data.keyboardInput) {
        confirmButtonDisabled = this.data.isOperationPanel
          ? !this.data.isPlayer && !this.data.isNextPlayer
          : Object.values(this.data.selectedMemberMap).every(selectedMember => selectedMember === false);
      }

      this.setData({ confirmButtonDisabled });
    },

    toggleKeyboardSelectorVisible(): void {
      if (!this.data.isOperationPanel || ['碰', '跑', '胡', '碰胡', '跑胡'].includes(this.data.keyboardDisplay)) {
        this.setData({ keyboardSelectorVisible: true });
      } else {
        this.setData({
          keyboardSelectorVisible: false,
          selectedPlayer: ''
        });
      }
    },

    onSelectedPlayerChange(e: WechatMiniprogram.BaseEvent): void {
      const selectedPlayer: string = e.currentTarget.dataset.openid;

      if (this.data.selectedPlayer === selectedPlayer) {
        this.setData({ selectedPlayer: '' });
      } else {
        this.setData({ selectedPlayer });
      }
    },

    onSelectedMemberChange(e: WechatMiniprogram.BaseEvent): void {
      const selectedMember: string = e.currentTarget.dataset.openid;
      const selectedMemberMap = this.data.selectedMemberMap;

      if (selectedMemberMap[selectedMember]) {
        selectedMemberMap[selectedMember] = false;
      } else {
        selectedMemberMap[selectedMember] = true;
      }

      this.setData({ selectedMemberMap });
    },

    onBackspace(): void {
      const keyboardInput = this.data.keyboardInput;
      
      if (keyboardInput.length > 0) {
        this.setData({ keyboardInput: keyboardInput.slice(0, -1) as KeyboardInput });
      }
    },

    onOperationInputChange(e: WechatMiniprogram.BaseEvent): void {
      const operationInput: OperationInput = e.currentTarget.dataset.value;
      const keyboardInput = this.data.keyboardInput + operationInput as OperationInput;

      if (OPERATION_MAP[keyboardInput]) {
        this.setData({ keyboardInput });
      }
    },

    onNumberInputChange(e: WechatMiniprogram.BaseEvent): void {
      const numberInput: NumberInput = e.currentTarget.dataset.value;

      if (this.data.keyboardInput ? this.data.keyboardInput.length < 3 : numberInput !== '0') {
        this.setData({ keyboardInput: (this.data.keyboardInput + numberInput) as NumberInput });
      }
    },

    handleKeyboardDisplay(): void {
      const keyboardInput = this.data.keyboardInput;

      if (this.data.isOperationPanel) {
        if (keyboardInput === '胡胡') {
          if (this.data.nextDealer === this.data.openid) {
            this.setData({ keyboardDisplay: '天胡' });
          } else {
            this.setData({ keyboardDisplay: '地胡' });
          }
        } else if (keyboardInput) {
          this.setData({ keyboardDisplay: OPERATION_MAP[keyboardInput as OperationInput] });
        } else {
          this.setData({ keyboardDisplay: '' });
        }
      } else {
        if (keyboardInput) {
          this.setData({ keyboardDisplay: keyboardInput as NumberInput });
        } else {
          this.setData({ keyboardDisplay: '0' });
        }
      }
    },

    switchKeyboard(): void {
      this.setData({
        isOperationPanel: !this.data.isOperationPanel,

        selectedPlayer: '',
        selectedMemberMap: {},

        keyboardInput: ''
      });
    },

    onKeyboardVisibleChange(e: WechatMiniprogram.CustomEvent): void {
      this.setData({ keyboardVisible: e.detail.visible });
    },

    showKeyboard(): void {
      if (this.data.roomid) {
        const isOperationPanel = this.data.isGamePlaying !== -1 && (this.data.isPlayer || this.data.isNextPlayer);

        this.setData({
          keyboardVisible: true,
          isOperationPanel,

          keyboardInput: ''
        });
      }
    },

    closeKeyboard(): void {
      this.setData({
        keyboardVisible: false,

        selectedPlayer: '',
        selectedMemberMap: {},

        keyboardInput: ''
      });
    },

    navigateToInformation(): void {
      if (this.data.roomid) {
        wx.navigateTo({ url: '/pages/information/information' });
      }
    }
  }
})
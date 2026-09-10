import storage from '../../utils/storage';

const app = getApp<IAppOption>();
export {};

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
  actionGroupList: ActionGroup[],

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
    'isGamePlaying': function (): void {
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
        imageUrl: '/images/PenghuScoreCalculator5_4.jpg'
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
              this.updateActionGroupList(databaseRoomData);
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
            memberData.avatarSrc = '/images/PenghuScoreCalculator.jpg';
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
          memberData.avatarSrc = '/images/PenghuScoreCalculator.jpg';
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

    updateActionGroupList(databaseRoomData: DatabaseRoomData, actionGroupList: ActionGroup[] = []): void {
      const { actionDataList } = databaseRoomData;
      const memberDataList = this.data.memberDataList;
      const lastActionid: number = actionGroupList.at(-1)?.actionDataList.at(-1)!.actionid ?? -1;
      let lastActionRound: number = actionGroupList.at(-1)?.actionDataList.at(-1)!.round ?? 0;

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
        } = memberDataList.find(memberData => memberData.openid === payer)!;

        const {
          scores: receiverScores, roundScores: receiverRoundScores,
          ...receiverData
        } = memberDataList.find(memberData => memberData.openid === receiver)!;
        
        const actionData: ActionData = {
          actionid,
          group,

          isUndo,
          isTemp: false,

          payerData,
          receiverData,

          name,
          scores,
          round
        }

        if (actionid === group) {
          const isNewRound: boolean = round > lastActionRound;

          const actionGroup: ActionGroup = {
            mainActionid: actionid,
            payerList: [payer],
            receiverList: [receiver],

            isNewRound,
            totalScores: scores,

            actionDataList: [actionData]
          }

          actionGroupList.push(actionGroup);
          lastActionRound = round;
        } else {
          const actionGroup = actionGroupList.find(actionGroup => actionGroup.mainActionid === group)!;

          if (!actionGroup.payerList.includes(payer)) {
            actionGroup.payerList.push(payer);
          }

          if (!actionGroup.receiverList.includes(receiver)) {
            actionGroup.receiverList.push(receiver);
          }

          actionGroup.totalScores += scores;
          actionGroup.actionDataList.push(actionData);
        }
      });

      this.setData({ actionGroupList: actionGroupList });
    },

    initializeGameData(databaseRoomData: DatabaseRoomData): void {
      const {
        isGamePlaying, round,
        playerList, dealer, holdDealer,
        nextPlayerTuple, nextDealer
      } = databaseRoomData;

      const playerDataList = playerList.map(player => {
        const {
          scores, roundScores,
          ...playerData
        } = this.data.memberDataList.find(memberData => memberData.openid === player)!;

        return playerData;
      });

      const nextPlayerDataTuple = nextPlayerTuple.map(nextPlayer => {
        if (!nextPlayer) {
          return {}
        }

        const {
          scores, roundScores,
          ...nextPlayerData
        } = this.data.memberDataList.find(memberData => memberData.openid === nextPlayer)!;

        return nextPlayerData;
      }) as [UserData | {}, UserData | {}, UserData | {}, UserData | {}];

      this.setData({
        isGamePlaying,
        round,

        playerDataList,
        dealer,
        holdDealer,

        nextPlayerDataTuple,
        nextDealer
      });
    },

    cacheRoomData(fieldList?: (keyof RoomPageRoomData)[]): void {
      const cachedRoomData: RoomData = wx.getStorageSync('room') || {};
      const currentRoomData: RoomPageRoomData = {
        roomid: this.data.roomid,

        memberDataList: this.data.memberDataList,
        actionGroupList: this.data.actionGroupList,

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

    handleConfirm(): void {
      if (this.data.isOperationPanel) {
        this.takeOperation();
      } else {
        this.transferScores();
      }
    },

    async takeOperation(): Promise<void> {
      const payer: string = this.data.selectedPlayer;
      const actionName = this.data.keyboardDisplay as OperationDisplay;

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
    },

    async transferScores(): Promise<void> {
      const receiverList: string[] = Object.keys(this.data.selectedMemberMap).filter(selectedMember => this.data.selectedMemberMap[selectedMember]);
      const scores: number = Number(this.data.keyboardDisplay) ?? 0;

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
    },

    async undoAction(e: WechatMiniprogram.CustomEvent): Promise<void> {
      const actionid: number = e.detail.value;

      try {
        const { result } = await wx.cloud.callFunction({
          name: 'P2_undoAction',
          data: {
            roomid: this.data.roomid,
            actionid
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
          if ([this.data.dealer, this.data.newDealer].includes(this.data.openid)) {
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
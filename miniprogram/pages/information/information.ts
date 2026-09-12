import storage from '../../utils/storage';

const app = getApp<IAppOption>();
export {};

type SeatData =
| { label: -1, seat: '中心' }
| { label: 0, seat: '北' }
| { label: 1, seat: '西' }
| { label: 2, seat: '南' }
| { label: 3, seat: '东' }
| { label: 4, seat: '北鸟' }
| { label: 5, seat: '西鸟' }
| { label: 6, seat: '南鸟' }
| { label: 7, seat: '东鸟' }

type InformationPageRoomData = Pick<RoomData, Extract<keyof RoomData, keyof InformationPageData>>

interface InformationPageData {
  openid: string,

  roomid: string,
  qrCodeSrc: string,
  qrCodeFileID: string,
  createdAt: string,
  remainTime: number,

  gameConfig: GameConfig,

  memberDataList: MemberData[],

  isGamePlaying: number,

  isNextPlayer: boolean,
  nextPlayerDataTuple: [UserData | {}, UserData | {}, UserData | {}, UserData | {}],
  backedPlayer: string,
  nextBackerDataMap: Record<string, UserData[]>,
  nextDealer: string,

  isRandomBack: boolean,

  watcher: DB.RealtimeListener | null,

  seatDataList: SeatData[],

  seatLock: boolean,
  statusButtonDisabled: boolean,

  settleVisible: boolean,
  settleButtonLoading: boolean,

  targetSelectorVisible: boolean,
  targetSelectorButtonLoading: boolean,
  dealerSelectorVisible: boolean,
  dealerSelectorButtonLoading: boolean,
  randomBackButtonLoading: boolean,
  selectedPlayer: string,

  backerDataVisible: boolean,
  targetNickname: string,
  backerDataList: UserData[]
}

Component({
  data: {
    openid: '',

    roomid: '',
    qrCodeSrc: '',
    qrCodeFileID: '',
    createdAt: '',
    remainTime: 0,

    gameConfig: {
      mode: 'addition',
      limit: 4,
      fiveTriWinConsiderHoldDealer: true,
      heavenWinConsiderHoldDealer: true
    },

    memberDataList: [],

    isGamePlaying: 0,

    isNextPlayer: false,
    nextPlayerDataTuple: [{}, {}, {}, {}],
    backedPlayer: '',
    nextBackerDataMap: {},
    nextDealer: '',
    isRandomBack: false,

    watcher: null,

    seatDataList: [
      { label: 5, seat: '西鸟' },
      { label: 0, seat: '北' },
      { label: 4, seat: '北鸟' },
      { label: 1, seat: '西' },
      { label: -1, seat: '中心' },
      { label: 3, seat: '东' },
      { label: 6, seat: '南鸟' },
      { label: 2, seat: '南' },
      { label: 7, seat: '东鸟' }
    ],

    seatLock: false,
    statusButtonDisabled: true,

    settleVisible: false,
    settleButtonLoading: false,

    targetSelectorVisible: false,
    targetSelectorButtonLoading: false,
    dealerSelectorVisible: false,
    dealerSelectorButtonLoading: false,
    randomBackButtonLoading: false,
    selectedPlayer: '',

    backerDataVisible: false,
    targetNickname: '',
    backerDataList: []
  } as InformationPageData,

  observers: {
    'createdAt': function (): void {
      const remainTime: number = 12 * 60 * 60 * 1000 - (Date.now() - new Date(this.data.createdAt).getTime()) || 0;
      this.setData({ remainTime });
    },

    'isGamePlaying': function (): void {
      const statusButtonDisabled: boolean = this.data.isGamePlaying !== 0;
      this.setData({ statusButtonDisabled });
    },

    'nextPlayerDataTuple': function (): void {
      const isNextPlayer: boolean = this.data.nextPlayerDataTuple.some(nextPlayerData =>
        'openid' in nextPlayerData && nextPlayerData.openid === this.data.openid
      );

      this.setData({ isNextPlayer });
    },

    'nextBackerDataMap': function (): void {
      const backedPlayer: string = Object.keys(this.data.nextBackerDataMap).find(target =>
        this.data.nextBackerDataMap[target].some(nextBackerData => nextBackerData.openid === this.data.openid)
      ) ?? '';

      this.setData({ backedPlayer });
    }
  },

  methods: {
    onLoad() {
      wx.setNavigationBarTitle({ title: '房间' + app.globalData.currentRoomid });
      this.setData({
        openid: app.globalData.userData.openid,
        roomid: app.globalData.currentRoomid
      });

      this.getCachedRoomData();
    },

    onShow() {
      this.watchRoomData();
    },

    onHide() {
      this.closeWatcher();
    },

    onPullDownRefresh() {
      this.watchRoomData();
    },

    onShareAppMessage() {
      return {
        title: `碰胡计分器房间：${ this.data.roomid }`,
        path: `/pages/home/home?roomid=${ this.data.roomid }`,
        imageUrl: '/images/PenghuCalculator5_4.jpg'
      }
    },

    getCachedRoomData(): void {
      const cachedRoomData: Partial<RoomData> = wx.getStorageSync('room') || {};

      if (cachedRoomData.roomid !== this.data.roomid) {
        return
      }

      const {
        qrCodeSrc = '',
        qrCodeFileID = '',
        createdAt = '',

        gameConfig = {
          mode: 'addition',
          limit: 4,
          fiveTriWinConsiderHoldDealer: true,
          heavenWinConsiderHoldDealer: true
        },

        memberDataList = [],

        isGamePlaying = 0,

        nextPlayerDataTuple = [{}, {}, {}, {}],
        nextBackerDataMap = {},
        nextDealer = '',

        isRandomBack = false
      } = cachedRoomData;

      this.setData({
        qrCodeSrc, qrCodeFileID, createdAt,
        gameConfig,
        memberDataList,
        isGamePlaying,
        nextPlayerDataTuple, nextBackerDataMap, nextDealer,
        isRandomBack
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
              await this.initializeGameData(databaseRoomData);
              this.cacheRoomData();
            } else if (dataType === 'update') {
              const updatedFields = docChange.updatedFields!;

              const updatedMember = Object.keys(updatedFields).find(updatedField => updatedField.startsWith('memberList'));

              if (updatedMember) {
                await this.updateMemberData(databaseRoomData, updatedFields[updatedMember]);
                this.cacheRoomData(['memberDataList']);
              }

              if (updatedFields.isGamePlaying) {
                this.updateIsGamePlaying(databaseRoomData);
                this.cacheRoomData(['isGamePlaying']);
              }

              if (updatedFields.nextPlayerTuple) {
                this.updateNextPlayerDataTuple(databaseRoomData);
                this.cacheRoomData(['nextPlayerDataTuple']);
              }

              const updatedNextBackerMap = Object.keys(updatedFields).find(updatedField => updatedField.startsWith('nextBackerMap'));

              if (updatedNextBackerMap) {
                this.updateNextBackerDataMap(databaseRoomData);
                this.cacheRoomData(['nextBackerDataMap']);
              }

              if (updatedFields.nextDealer) {
                this.updateNextDealer(databaseRoomData);
                this.cacheRoomData(['nextDealer']);
              }

              const updatedIsRandomBack = Object.keys(updatedFields).find(updatedField => updatedField.startsWith('isRandomBackMap'));

              if (updatedIsRandomBack) {
                this.updateIsRandomBack(databaseRoomData);
                this.cacheRoomData(['isRandomBack']);
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

    async initializeGameData(databaseRoomData: DatabaseRoomData): Promise<void> {
      this.updateIsGamePlaying(databaseRoomData);

      this.updateNextPlayerDataTuple(databaseRoomData);
      this.updateNextBackerDataMap(databaseRoomData);
      this.updateNextDealer(databaseRoomData);
      
      this.updateIsRandomBack(databaseRoomData);

      const { qrCodeUrl, qrCodeFileID, createdAt, gameConfig } = databaseRoomData;
      const qrCodeSrc = await storage.cacheImage(qrCodeFileID, qrCodeUrl, this.data.qrCodeSrc);

      this.setData({ qrCodeSrc, qrCodeFileID, createdAt, gameConfig });
    },

    updateIsGamePlaying(databaseRoomData: DatabaseRoomData): void {
      this.setData({ isGamePlaying: databaseRoomData.isGamePlaying });
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

    updateNextBackerDataMap(databaseRoomData: DatabaseRoomData): void {
      const nextBackerDataMap: Record<string, UserData[]> = Object.entries(databaseRoomData.nextBackerMap).reduce(
        (acc: Record<string, UserData[]>, [target, nextBackerList]) => {
          const nextBackerDataList = nextBackerList.map(nextBacker => {
            const {
              scores, roundScores,
              ...nextBackerData
            } = this.data.memberDataList.find(memberData => memberData.openid === nextBacker)!;
            
            return nextBackerData
          });
          
          acc[target] = nextBackerDataList;
          return acc;
      }, {});

      this.setData({ nextBackerDataMap });
    },

    updateNextDealer(databaseRoomData: DatabaseRoomData): void {
      this.setData({ nextDealer: databaseRoomData.nextDealer });
    },

    updateIsRandomBack(databaseRoomData: DatabaseRoomData): void {
      const isRandomBack = databaseRoomData.isRandomBackMap[this.data.openid] ?? false;
      this.setData({ isRandomBack });
    },

    cacheRoomData(fieldList?: (keyof InformationPageRoomData)[]): void {
      const cachedRoomData: RoomData = wx.getStorageSync('room') || {};
      const currentRoomData: InformationPageRoomData = {
        roomid: this.data.roomid,
        qrCodeSrc: this.data.qrCodeSrc,
        qrCodeFileID: this.data.qrCodeFileID,
        createdAt: this.data.createdAt,

        gameConfig: this.data.gameConfig,

        memberDataList: this.data.memberDataList,

        isGamePlaying: this.data.isGamePlaying,

        nextPlayerDataTuple: this.data.nextPlayerDataTuple,
        nextBackerDataMap: this.data.nextBackerDataMap,
        nextDealer: this.data.nextDealer,

        isRandomBack: this.data.isRandomBack
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

    async handleBeSpectator(): Promise<void> {
      if (!this.data.isNextPlayer) {
        return
      }

      this.setData({ statusButtonDisabled: true });

      try {
        const { result } = await wx.cloud.callFunction({
          name: 'P2_updateNextPlayerTuple',
          data: {
            roomid: this.data.roomid,
            seat: -1
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
        console.error('切换旁观失败', err);
        wx.showToast({
          title: '切换旁观失败',
          icon: 'error'
        });
      }

      this.setData({ statusButtonDisabled: false });
    },

    async handleTransferDealer(): Promise<void> {
      if (!this.data.selectedPlayer) {
        wx.showToast({
          title: '未选择玩家',
          icon: 'none'
        });

        return
      }

      this.setData({ dealerSelectorButtonLoading: true });

      try {  
        const { result } = await wx.cloud.callFunction({
          name: 'P2_updateNextDealer',
          data: {
            roomid: this.data.roomid,
            nextDealer: this.data.selectedPlayer
          }
        }) as CallFunctionResult<null>;

        if (result.code === 403) {
          wx.showToast({
            title: `${result.message}`,
            icon: 'none'
          });
        } else if (result.code === 200) {
          this.closeDealerSelector();
        } else {
          throw result
        }
      } catch (err) {
        console.error('转让庄家失败', err);
        wx.showToast({
          title: '转让庄家失败',
          icon: 'error'
        });
      }

      this.setData({ dealerSelectorButtonLoading: false });
    },

    async handleBeBacker(): Promise<void> {
      if (!this.data.selectedPlayer) {
        wx.showToast({
          title: '未选择玩家',
          icon: 'none'
        });

        return
      }

      this.setData({ targetSelectorButtonLoading: true });

      try {
        const { result } = await wx.cloud.callFunction({
          name: 'P2_updateNextBackerMap',
          data: {
            roomid: this.data.roomid,
            target: this.data.selectedPlayer
          }
        }) as CallFunctionResult<null>;

        if (result.code === 403) {
          wx.showToast({
            title: `${result.message}`,
            icon: 'none'
          });
        } else if (result.code === 200) {
          this.closeTargetSelector();
        } else {
          throw result
        }
      } catch (err) {
        console.error('砸鸟失败', err);
        wx.showToast({
          title: '砸鸟失败',
          icon: 'error'
        });
      }

      this.setData({ targetSelectorButtonLoading: false });
    },

    async handleRandomBack(): Promise<void> {
      this.setData({ randomBackButtonLoading: true });

      try {
        const { result } = await wx.cloud.callFunction({
          name: 'P2_updateIsRandomBackMap',
          data: {
            roomid: this.data.roomid,
            isRandomBack: !this.data.isRandomBack
          }
        }) as CallFunctionResult<null>;

        if (result.code === 403) {
          wx.showToast({
            title: `${result.message}`,
            icon: 'none'
          });
        } else if (result.code === 200) {
          this.setData({ selectedPlayer: this.data.backedPlayer });
        } else {
          throw result
        }
      } catch (err) {
        console.error('随机砸鸟失败', err);
        wx.showToast({
          title: '随机砸鸟失败',
          icon: 'error'
        });
      }

      this.setData({ randomBackButtonLoading: false });
    },

    toggleDirectionLock(): void {
      this.setData({ directionLock: !this.data.directionLock });
    },

    rotateDirection(offset: number): void {
      const seatDataList: SeatData[] = [];

      this.data.seatDataList.forEach((seatData, index) => {
        if (seatData.label === -1) {
          seatDataList[index] = seatData;
        } else {
          let row = Math.floor(index / 3);
          let col = index % 3;

          for (let i = 0; i < offset; i++) {
            const currentRow = row;
            row = 2 - col;
            col = currentRow;
          }
          
          seatDataList[row * 3 + col] = seatData;
        }
      });

      this.setData({ seatDataList });
    },

    handleRotate(e: WechatMiniprogram.BaseEvent): void {
      const offset: number = e.currentTarget.dataset.offset;

      if (!this.data.directionLock) {
        this.rotateDirection(offset);
      }
    },

    handlePlayerSelect(e: WechatMiniprogram.BaseEvent): void {
      if (!this.data.isNextPlayer && this.data.isRandomBack) {
        return
      }

      const target: string = e.currentTarget.dataset.openid;

      if (target !== this.data.selectedPlayer) {
        this.setData({ selectedPlayer: target });
      }
    },

    showSettle(): void {
      this.setData({ settleVisible: true });
    },

    closeSettle(): void {
      this.setData({ settleVisible: false });
    },

    showDealerSelector(): void {
      this.setData({ dealerSelectorVisible: true });
    },

    closeDealerSelector(): void {
      this.setData({
        dealerSelectorVisible: false,
        selectedPlayer: ''
      });
    },

    showTargetSelector(): void {
      this.setData({
        targetSelectorVisible: true,
        selectedPlayer: this.data.backedPlayer
      });
    },

    closeTargetSelector(): void {
      this.setData({
        targetSelectorVisible: false,
        selectedPlayer: ''
      });
    },

    showBackerData(e: WechatMiniprogram.BaseEvent): void {
      const targetSeat: number = e.currentTarget.dataset.seat;
      const { openid, nickname: targetNickname } = this.data.nextPlayerDataTuple[targetSeat] as UserData;
      const backerDataList = this.data.nextBackerDataMap[openid];

      if (backerDataList.length < 2) {
        return
      }

      this.setData({
        backerDataVisible: true,
        targetNickname,
        backerDataList
      });
    },

    closeBackerData(): void {
      this.setData({ backerDataVisible: false });
    },

    navigateToHistory(): void {
      wx.switchTab({ url: '/pages/history/history' });
    }
  }
})
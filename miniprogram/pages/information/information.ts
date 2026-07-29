import storage from '../../utils/storage';

const app = getApp<IAppOption>();
export {};

interface InformationPageData {
  openid: string,
  roomid: string,
  qrCodeUrl: string,
  createdAt: string,
  remainTime: number,

  gameConfig: GameConfig,

  memberDataList: UserData[],

  isGamePlaying: number,

  isNextPlayer: boolean,
  nextPlayerDataTuple: [UserData | {}, UserData | {}, UserData | {}, UserData | {}],
  backedPlayer: string,
  nextBackerDataMap: Record<string, UserData[]>,
  nextDealer: string,
  isRandomBack: boolean,

  watcher: DB.RealtimeListener | null,

  seatDataList: ({
    label: -1,
    seat: '中心'
  } | {
    label: 0 | 1 | 2 | 3,
    seat: '北' | '西' | '南' | '东'
  } | {
    label: 4 | 5 | 6 | 7,
    seat: '北鸟' | '西鸟' | '南鸟' | '东鸟'
  })[],

  seatLock: boolean,
  statusButtonDisabled: boolean,

  settleVisible: boolean,
  settleButtonLoading: boolean,

  backerDataVisible: boolean,
  backerDataList: UserData[],

  selectorVisible: boolean,
  selectedPlayer: string
}

Component({
  data: {
    openid: '',
    roomid: '',
    qrCodeUrl: '',
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

    backerDataVisible: false,
    backerDataList: [],

    selectorVisible: false,
    selectedPlayer: ''
  } as InformationPageData,

  observers: {
    'createdAt': function (): void {
      const remainTime: number = 12 * 60 * 60 * 1000 - (Date.now() - new Date(this.data.createdAt).getTime());
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
    },

    onReady() {

    },

    onShow() {
      this.watchRoomData();
    },

    onHide() {
      this.closeWatcher();
    },

    onUnload() {

    },

    onPullDownRefresh() {
      this.watchRoomData();
    },

    onReachBottom() {

    },

    onShareAppMessage() {
      return {
        title: `碰胡计分器房间：${ this.data.roomid }`,
        path: `/pages/home/home?roomid=${ this.data.roomid }`,
        imageUrl: '/images/PenghuScorekeeper5_4.jpg'
      }
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
              this.initializeGameData(databaseRoomData);
            } else if (dataType === 'update') {
              const updatedFields = docChange.updatedFields!;
              console.log(updatedFields);

              const updatedMemberList = Object.keys(updatedFields).find(updatedField => updatedField.startsWith('memberList'));

              if (updatedMemberList) {
                await this.updateMemberData(updatedFields[updatedMemberList]);
              }

              if (updatedFields.isGamePlaying) {
                this.updateIsGamePlaying(databaseRoomData);
              }

              if (updatedFields.nextPlayerTuple) {
                this.updateNextPlayerDataTuple(databaseRoomData);
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
      const { memberList } = databaseRoomData;

      try {
        const { result } = await wx.cloud.callFunction({
          name: 'P2_getUserDataList',
          data: { userList: memberList.filter(member => member !== this.data.openid) }
        }) as CallFunctionResult<UserData[]>;
        
        if (result.code !== 200) {
          throw result;
        }

        const userDataList = result.data;
        userDataList.unshift(app.globalData.userData);

        const memberDataList: UserData[] = await Promise.all(userDataList.map(async userData => {
          if (userData.avatarUrl && userData.avatarFileID) {  
            userData.avatarUrl = await storage.downloadImage(userData.avatarUrl, userData.avatarFileID);
          } else {
            userData.avatarUrl = '/images/PenghuScorekeeper.jpg';
          }

          return userData
        }));

        this.setData({ memberDataList });
      } catch (err) {
        console.error('初始化成员信息列表失败', err);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
    },

    async updateMemberData(openid: string): Promise<void> {
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'P2_getUserDataList',
          data: { userList: [openid] }
        }) as CallFunctionResult<UserData[]>;
        
        if (result.code !== 200) {
          throw result;
        }

        const userData = result.data[0];

        if (userData.avatarUrl && userData.avatarFileID) {  
          userData.avatarUrl = await storage.downloadImage(userData.avatarUrl, userData.avatarFileID);
        } else {
          userData.avatarUrl = '/images/PenghuScorekeeper.jpg';
        }

        const memberDataList = this.data.memberDataList;
        memberDataList.push(userData);

        this.setData({ memberDataList });
      } catch (err) {
        console.error('更新成员信息列表失败', err);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
    },

    initializeGameData(databaseRoomData: DatabaseRoomData): void {
      this.updateIsGamePlaying(databaseRoomData);
      this.updateNextPlayerDataTuple(databaseRoomData);
      this.updateNextBackerDataMap(databaseRoomData);
      this.updateNextDealer(databaseRoomData);
      this.updateIsRandomBack(databaseRoomData);

      const { qrCodeUrl, createdAt, gameConfig } = databaseRoomData;
      this.setData({ qrCodeUrl, createdAt, gameConfig });
    },

    updateIsGamePlaying(databaseRoomData: DatabaseRoomData): void {
      this.setData({ isGamePlaying: databaseRoomData.isGamePlaying });
    },

    updateNextPlayerDataTuple(databaseRoomData: DatabaseRoomData): void {
      const nextPlayerDataTuple = databaseRoomData.nextPlayerTuple.map(nextPlayer => {
        if (!nextPlayer) {
          return {}
        }

        const nextPlayerData = this.data.memberDataList.find(memberData => memberData.openid === nextPlayer)!;
        return nextPlayerData
      }) as [UserData | {}, UserData | {}, UserData | {}, UserData | {}];

      this.setData({ nextPlayerDataTuple });
    },

    updateNextBackerDataMap(databaseRoomData: DatabaseRoomData): void {
      const nextBackerDataMap: Record<string, UserData[]> = Object.entries(databaseRoomData.nextBackerMap).reduce(
        (acc: Record<string, UserData[]>, [target, nextBackerList]) => {
          const nextBackerDataList = nextBackerList.map(nextBacker => {
            const nextBackerData = this.data.memberDataList.find(memberData => memberData.openid === nextBacker)!;
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

    toggleStatusButtonDisabled(): void {
      this.setData({ statusButtonDisabled: this.data.statusButtonDisabled });
    },

    toggleDirectionLock(): void {
      this.setData({ directionLock: !this.data.directionLock });
    },

    rotateDirection(offset: number): void {
      const seatDataList = this.data.seatDataList.map(seatData => {
        if (seatData.label > 3) {
          seatData.label = ((seatData.label + offset) % 4 + 4) as typeof seatData.label;
        } else if (seatData.label > -1) {
          seatData.label = ((seatData.label + offset) % 4) as typeof seatData.label;
        }

        return seatData;
      });

      this.setData({ seatDataList });
    },

    handleRotate(e: WechatMiniprogram.BaseEvent): void {
      const offset: number = e.currentTarget.dataset.offset;

      if (!this.data.directionLock) {
        this.rotateDirection(offset);
      }
    },

    showBackerData(): void {
      this.setData({ backerDataVisible: true });
    },

    closeBackerData(): void {
      this.setData({ backerDataVisible: false });
    },

    showSelector(): void {
      this.setData({ selectorVisible: true });
    },

    closeSelector(): void {
      this.setData({ selectorVisible: false });
    },

    navigateToHistory(): void {
      wx.switchTab({ url: '/pages/history/history' });
    }
  }
})
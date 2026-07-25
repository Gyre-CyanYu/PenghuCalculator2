const app = getApp<IAppOption>();
export {};

interface InformationPageData {
  openid: string,
  roomid: string,
  qrCodeUrl: string,
  createdAt: string,
  remainTime: number,

  gameConfig: GameConfig,

  memberDataList: MemberData[],

  isGamePlaying: number,

  backedPlayer: string,

  isNextPlayer: boolean,
  nextPlayerDataMap: Record<0 | 1 | 2 | 3, UserData> | {},
  nextBackerDataListMap: Record<string, UserData[]>,
  nextDealer: string,

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

  isPlayerSelecting: boolean,
  isRandomBack: boolean,
  seatLock: boolean,
  seatButtonDisabled: boolean,
  selectedPlayer: string,

  settleVisible: boolean,
  settleButtonLoading: boolean,

  backerDataVisible: boolean,
  backerDataList: UserData[]
}

Page({
  data: {
    openid: '',
    roomid: '',
    qrCodeUrl: '',
    createdAt: '',
    remainTime: 0,

    gameConfig: {
      mode: 'addition',
      limit: 4,
      fiveTriWinConsiderHoldDealer: false,
      heavenWinConsiderHoldDealer: false
    },

    memberDataList: [],

    isGamePlaying: 0,

    backedPlayer: '',

    isNextPlayer: false,
    nextPlayerDataMap: {},
    nextBackerDataListMap: {},
    nextDealer: '',

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

    isPlayerSelecting: false,
    isRandomBack: false,
    seatLock: false,
    seatButtonDisabled: true,
    selectedPlayer: '',

    settleVisible: false,
    settleButtonLoading: false,

    backerDataVisible: false,
    backerDataList: [],
  } as InformationPageData,

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

          } else if (dataType === 'update') {

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
})
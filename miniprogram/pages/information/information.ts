interface InformationPageData {
  openid: string,
  roomid: string,
  qrCodeUrl: string,
  createdAt: string,

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

  onLoad(options) {

  },

  onReady() {

  },

  onShow() {

  },

  onHide() {

  },

  onUnload() {

  },

  onPullDownRefresh() {

  },

  onReachBottom() {

  },

  onShareAppMessage() {

  },

  
})
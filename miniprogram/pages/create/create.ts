const app = getApp<IAppOption>();

interface CreatePageData {
  gameConfig: GameConfig,

  configDataList: {
    name: keyof GameConfig,
    defaultValue: GameConfig[keyof GameConfig],

    optionList: {
      value: GameConfig[keyof GameConfig],
      label: string
    }[],

    title: string,
    content: string
  }[],
  
  createButtonLoading: boolean
}

Page({
  data: {
    gameConfig: {
      mode: 'addition',
      limit: 4,
      fiveTriWinConsiderHoldDealer: true,
      heavenWinConsiderHoldDealer: true
    },

    createButtonLoading: false,

    configDataList: [
      {
        name: 'mode',
        defaultValue: 'addition',

        optionList: [
          {value: 'addition', label: '加法'},
          {value: 'multiplication', label: '乘法'}
        ],

        title: '连庄模式',
        content: ''
      },
      {
        name: 'limit',
        defaultValue: 4,

        optionList: [
          {value: 0, label: '连中'},
          {value: 4, label: '四庄'},
          {value: 8, label: '八庄'}
        ],

        title: '连庄上限',
        content: ''
      },
      {
        name: 'fiveTriWinConsiderHoldDealer',
        defaultValue: true,

        optionList: [
          {value: true, label: '是'},
          {value: false, label: '否'}
        ],

        title: '庄家五福',
        content: '庄家的五福得分将根据连庄数叠加'
      },
      {
        name: 'heavenWinConsiderHoldDealer',
        defaultValue: true,

        optionList: [
          {value: true, label: '是'},
          {value: false, label: '否'}
        ],

        title: '庄家天胡',
        content: '庄家的天胡得分将根据连庄数叠加'
      }
    ]
  } as CreatePageData,

  onShareAppMessage() {
    return {
      title: '碰胡计分器',
      path: '/pages/home/home',
      imageUrl: '/images/PenghuScorekeeper5×4.jpg'
    }
  },

  async handleCreate() {
    this.setData({ createButtonLoading: true });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'createRoomData',
        data: { gameConfig: this.data.gameConfig }
      }) as unknown as { result: Result<string> };

      if (result.code === 201) {
        app.globalData.currentRoomid = result.data;
        wx.switchTab({ url: '/pages/room/room' });
      } else if (result.code === 503) {
        wx.showToast({
          title: '服务器繁忙',
          icon: 'none'
        });
      } else {
        throw result;
      }
    } catch (err) {
      console.error('创建房间失败', err);
      wx.showToast({
        title: '创建房间失败',
        icon: 'error'
      });
    }

    this.setData({ createButtonLoading: false });
  },

  onConfigChange(e: WechatMiniprogram.CustomEvent) {
    const name: keyof GameConfig = e.currentTarget.dataset.name;
    const value: GameConfig[keyof GameConfig] = e.detail.value;

    this.setData({ [`gameConfig.${name}`]: value });
  }
})
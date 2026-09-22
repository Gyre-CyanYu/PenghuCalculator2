const app = getApp<IAppOption>();
export {};

interface ConfigDataItem<T extends keyof GameConfig> {
  name: T,
  defaultValue: GameConfig[T],

  optionList: {
    value: GameConfig[T],
    label: string
  }[],

  title: string,
  content: string
}

type ConfigData = {
  [T in keyof GameConfig]: ConfigDataItem<T>
}[keyof GameConfig]

interface CreatePageData {
  createButtonLoading: boolean,

  configDataList: ConfigData[]
}

interface CreatePageCustomData {
  gameConfig: GameConfig
}

Page({
  data: {
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
          {value: 4, label: '4庄'},
          {value: 8, label: '8庄'}
        ],

        title: '连庄上限',
        content: ''
      },
      {
        name: 'fiveTriWinConsiderHoldDealer',
        defaultValue: true,

        optionList: [
          {value: true, label: '考虑连庄'},
          {value: false, label: '不考虑连庄'}
        ],

        title: '庄家五福',
        content: '庄家的五福得分是否根据连庄数叠加'
      },
      {
        name: 'heavenWinConsiderHoldDealer',
        defaultValue: true,

        optionList: [
          {value: true, label: '考虑连庄'},
          {value: false, label: '不考虑连庄'}
        ],

        title: '庄家天胡',
        content: '庄家的天胡得分是否根据连庄数叠加'
      }
    ]
  } as CreatePageData,

  customData: { 
    gameConfig: {
      mode: 'addition',
      limit: 4,
      fiveTriWinConsiderHoldDealer: true,
      heavenWinConsiderHoldDealer: true
    }
  } as CreatePageCustomData,

  onShareAppMessage() {
    return {
      title: '碰胡计分器',
      path: '/pages/home/home',
      imageUrl: '/images/PenghuCalculator5_4.jpg'
    }
  },

  async handleCreate(): Promise<void> {
    this.setData({ createButtonLoading: true });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'P2_createRoomData',
        data: { gameConfig: this.customData.gameConfig }
      }) as CallFunctionResult<string>;

      if (result.code === 201) {
        app.globalData.currentRoomid = result.data;
        app.globalData.joinedRoomList.unshift(result.data);
        
        wx.switchTab({ url: '/pages/room/room' });
      } else if ([403, 503].includes(result.code)) {
        wx.showToast({
          title: result.message,
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

  onConfigChange(e: WechatMiniprogram.CustomEvent): void {
    const setGameConfig = <T extends keyof GameConfig>(name: T, value: GameConfig[T]): void => {
      this.customData.gameConfig[name] = value;
    };

    setGameConfig(e.currentTarget.dataset.name, e.detail.value);
  }
})
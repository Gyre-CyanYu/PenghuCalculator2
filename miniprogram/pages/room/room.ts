const app = getApp<IAppOption>();
export {};

interface RoomPageData {
  memberDataList: MemberData[],
  actionGroupList: ActionGroup[],
}

Page({
  data: {
    memberDataList: [
      {
        openid: '0',
        avatarUrl: '',
        nickname: '0',
        scores: 0,
        roundScores: 0
      },
      {
        openid: '1',
        avatarUrl: '',
        nickname: '1',
        scores: 0,
        roundScores: 0
      },
      {
        openid: '2',
        avatarUrl: '',
        nickname: '2',
        scores: 0,
        roundScores: 0
      },
      {
        openid: '3',
        avatarUrl: '',
        nickname: '3',
        scores: 0,
        roundScores: 0
      },
      {
        openid: '4',
        avatarUrl: '',
        nickname: '4',
        scores: 0,
        roundScores: 0
      }
    ],

    actionGroupList: [
      {
        payerList: ['0'],
        receiverList: ['1'],

        isNewRound: true,
        totalScores: 3,

        actionDataList: [
          {
            actionid: 0,
            group: 0,
            
            isUndo: false,
            isTemp: false,

            payerData: {
              openid: '0',
              avatarUrl: '',
              nickname: '0'
            },
            receiverData: {
              openid: '1',
              avatarUrl: '',
              nickname: '1'
            },

            name: '碰',
            scores: 3,
            round: 1
          }
        ],
      },
      {
        payerList: ['0'],
        receiverList: ['1', '2'],

        isNewRound: false,
        totalScores: 2,
        
        actionDataList: [
          {
            actionid: 1,
            group: 1,

            isUndo: false,
            isTemp: true,

            payerData: {
              openid: '0',
              avatarUrl: '',
              nickname: '0'
            },
            receiverData: {
              openid: '1',
              avatarUrl: '',
              nickname: '1'
            },

            name: '支出分值',
            scores: 1,
            round: 1
          },
          {
            actionid: 2,
            group: 1,

            isUndo: false,
            isTemp: true,

            payerData: {
              openid: '0',
              avatarUrl: '',
              nickname: '0'
            },
            receiverData: {
              openid: '2',
              avatarUrl: '',
              nickname: '2'
            },

            name: '支出分值',
            scores: 1,
            round: 1
          }
        ]
      },
      {
        payerList: ['0'],
        receiverList: ['1'],

        isNewRound: false,
        totalScores: 3,

        actionDataList: [
          {
            actionid: 3,
            group: 3,
            
            isUndo: false,
            isTemp: false,

            payerData: {
              openid: '0',
              avatarUrl: '',
              nickname: '0'
            },
            receiverData: {
              openid: '1',
              avatarUrl: '',
              nickname: '1'
            },

            name: '碰',
            scores: 3,
            round: 1
          }
        ],
      },
      {
        payerList: ['0'],
        receiverList: ['1'],

        isNewRound: false,
        totalScores: 3,

        actionDataList: [
          {
            actionid: 4,
            group: 4,
            
            isUndo: false,
            isTemp: false,

            payerData: {
              openid: '0',
              avatarUrl: '',
              nickname: '0'
            },
            receiverData: {
              openid: '1',
              avatarUrl: '',
              nickname: '1'
            },

            name: '碰',
            scores: 3,
            round: 1
          }
        ],
      },
      {
        payerList: ['0'],
        receiverList: ['1'],

        isNewRound: false,
        totalScores: 3,

        actionDataList: [
          {
            actionid: 5,
            group: 5,
            
            isUndo: false,
            isTemp: false,

            payerData: {
              openid: '0',
              avatarUrl: '',
              nickname: '0'
            },
            receiverData: {
              openid: '1',
              avatarUrl: '',
              nickname: '1'
            },

            name: '碰',
            scores: 3,
            round: 1
          }
        ],
      },
      {
        payerList: ['0'],
        receiverList: ['1'],

        isNewRound: false,
        totalScores: 3,

        actionDataList: [
          {
            actionid: 6,
            group: 6,
            
            isUndo: false,
            isTemp: false,

            payerData: {
              openid: '0',
              avatarUrl: '',
              nickname: '0'
            },
            receiverData: {
              openid: '1',
              avatarUrl: '',
              nickname: '1'
            },

            name: '碰',
            scores: 3,
            round: 1
          }
        ],
      },
    ],
  } as RoomPageData,

  onLoad(options) {
    
  },

  onReady() {

  },

  onShow() {
    wx.setNavigationBarTitle({ title: '房间' + app.globalData.currentRoomid });
    this.getTabBar().updateRoomid();
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

  undoAction(e: WechatMiniprogram.CustomEvent) {
    console.log(e.detail.value);
  }
})
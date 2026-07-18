import storage from '../../utils/storage';

const app = getApp<IAppOption>();
export {};

interface RoomPageData {
  openid: string,
  roomid: string,

  memberDataList: MemberData[],
  actionGroupList: ActionGroup[],

  isGamePlaying: number,
  round: number,

  watcher: DB.RealtimeListener | null,

  keyboardVisible: boolean,
  keyboardSelectorVisible: boolean,
  isOperationPanel: boolean,
}

Component({
  data: {
    openid: '',
    roomid: '',

    memberDataList: [],
    actionGroupList: [],

    isGamePlaying: 0,
    round: 0,

    watcher: null,

    keyboardVisible: false,
    keyboardSelectorVisible: false,
    isOperationPanel: true,
  } as RoomPageData,

  methods: {
    onLoad() {
      this.setData({ openid: app.globalData.userData.openid });
    },

    onShow() {
      wx.setNavigationBarTitle({ title: '房间' + app.globalData.currentRoomid });
      this.setData({ roomid: app.globalData.currentRoomid });
      this.getTabBar().updateRoomid();

      if (this.data.roomid) {
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
        imageUrl: '/images/PenghuScorekeeper5×4.jpg'
      }

      if (this.data.roomid) {
        shareData.title += `房间：${ this.data.roomid }`;
        shareData.path += `?roomid=${ this.data.roomid }`;
      }

      return shareData
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
              this.initializeActionGroupList(databaseRoomData);
            } else if (dataType === 'update') {
              const updatedFields = docChange.updatedFields!;
              const updatedMemberList = Object.keys(updatedFields).find(updatedField => updatedField.startsWith('memberList'));

              if (updatedMemberList) {
                await this.updateMemberData(databaseRoomData, updatedFields[updatedMemberList]);
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
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'P2_getUserDataList',
          data: { userList: databaseRoomData.memberList.filter(member => member !== this.data.openid) }
        }) as CallFunctionResult<UserData[]>;
        
        if (result.code !== 200) {
          throw result;
        }

        const userDataList = result.data;
        userDataList.unshift(app.globalData.userData);
  
        const memberDataList: MemberData[] = await Promise.all(userDataList.map(async userData => {
          if (userData.avatarUrl && userData.avatarFileID) {  
            userData.avatarUrl = await storage.downloadImage(userData.avatarUrl, userData.avatarFileID);
          } else {
            userData.avatarUrl = '/images/PenghuScorekeeper.jpg';
          }

          const memberData: MemberData = {
            ...userData,
            scores: databaseRoomData.scoresMap[userData.openid],
            roundScores: databaseRoomData.roundScoresMap[userData.openid]
          }

          return memberData
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

    initializeActionGroupList(databaseRoomData: DatabaseRoomData): void {
      const actionDataList = databaseRoomData.actionDataList;
      const actionGroupList: ActionGroup[]  = [];
      let lastActionRound: number = 0;
      
      actionDataList.forEach(databaseActionData => {
        const {
          actionid, group,
          isUndo,
          payer, receiver,
          name, scores, round
        } = databaseActionData;

        const payerData = this.data.memberDataList.find(memberData => memberData.openid === payer)!;
        const receiverData = this.data.memberDataList.find(memberData => memberData.openid === receiver)!;
        
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
          let isNewRound: boolean;

          if (actionid) {
            isNewRound = round !== lastActionRound;
          } else {
            isNewRound = round > 0;
          }

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
          const actionGroupIndex = actionGroupList.findIndex(actionGroup => actionGroup.mainActionid === group);
          actionGroupList[actionGroupIndex].actionDataList.push(actionData);
        }
      });

      this.setData({ actionGroupList });
    },

    async updateMemberData(databaseRoomData: DatabaseRoomData, openid: string): Promise<void> {
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

        const memberData: MemberData = {
          ...userData,
          scores: databaseRoomData.scoresMap[openid],
          roundScores: databaseRoomData.roundScoresMap[openid]
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

    undoAction(e: WechatMiniprogram.CustomEvent): void {
      console.log(e.detail.value);
    },

    switchKeyboard(): void {
      this.setData({ isOperationPanel: !this.data.isOperationPanel });
    },

    onKeyboardVisibleChange(e: WechatMiniprogram.CustomEvent): void {
      this.setData({ keyboardVisible: e.detail.visible });
    },

    showKeyboard(): void {
      if (this.data.roomid) {
        this.setData({ keyboardVisible: true });
      }
    },

    closeKeyboard(): void {
      this.setData({ keyboardVisible: false });
    },

    navigateToInformation(): void {
      wx.navigateTo({ url: '/pages/information/information' });
    }
  }
})
interface ActionCardComponentData {
  mainAction: ActionData | TempActionData,

  popoverVisible: boolean,
  actionGroupVisible: boolean,

  undoVisible: boolean,
  toggleVisible: boolean
}

Component({
  properties: {
    actionGroup: { type: Object },
    width: { type: String, value: 'calc(100vw - 64rpx)' }
  },

  data: {
    mainAction: {},

    popoverVisible: false,
    actionGroupVisible: false,

    undoVisible: true,
    toggleVisible: true
  } as ActionCardComponentData,

  observers: {
    'actionGroup.actionDataList[0]': function(): void {
      const actionDataList: (ActionData | TempActionData)[] = this.properties.actionGroup.actionDataList;

      this.setData({
        mainAction: actionDataList[0],
        toggleVisible: actionDataList.length > 1
      });
    }
  },

  methods: {
    undoAction(): void {
      this.setData({ popoverVisible: false });
      this.triggerEvent('undo', { value: this.data.mainAction.actionid });
    },

    toggleActionGroup(): void {
      this.setData({
        popoverVisible: false,
        actionGroupVisible: !this.data.actionGroupVisible
      });
    },

    onVisibleChange(e: WechatMiniprogram.CustomEvent): void {
      this.setData({ popoverVisible: e.detail.visible });
    },

    showPopover(): void {
      this.setData({ popoverVisible: true });
    }
  }
})
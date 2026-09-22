Component({
  properties: {
    avatarSrc: { type: String },
    nickname: { type: String },
    badgeProps: { type: Object },

    userGroup: { type: Boolean, value: false },
    userGroupLength: { type: Number, value: 1 },

    scores: { type: String, optionalTypes: [Number], value: '' },
    roundScores: { type: String, optionalTypes: [Number], value: '' },

    hidden: { type: Boolean, value: false },
    width: { type: String },
    nicknameClass: { type: String, value: 'subtitle' },
    scoresClass: { type: String, value: 'content' }
  },

  data: {
    maxWidth: ''
  },

  lifetimes: {
    /* ready() {
      this.createSelectorQuery().select('.userWrapper').boundingClientRect(res => {
        if (res.width) {
          const maxWidth = res.width + 'px';
          this.setData({ maxWidth });
        } else if (this.properties.width) {
          this.setData({ maxWidth: this.properties.width });
        }
      }).exec();
    } */
  }
})
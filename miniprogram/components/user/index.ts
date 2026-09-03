Component({
  properties: {
    avatarSrc: { type: String },
    nickname: { type: String },
    badgeProps: { type: Object },
    icon: { type: String, value: 'user' },

    userGroup: { type: Boolean, value: false },
    userGroupLength: { type: Number, value: 1 },

    scores: { type: String, optionalTypes: [Number], value: '' },
    roundScores: { type: String, optionalTypes: [Number], value: '' },

    hidden: { type: Boolean, value: false },
    width: { type: String },
    nicknameClass: { type: String, value: 'subtitle' },
    scoresClass: { type: String, value: 'content' }
  }
})
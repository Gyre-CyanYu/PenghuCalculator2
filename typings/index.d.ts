/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    env: string,
    userData: UserData,
    currentRoomid: string,
    joinedRoomList: string[]
  },

  getCurrentUserData: () => Promise<void>
}

interface UserData {
  openid: string,
  avatarUrl: string,
  avatarFileID: string,
  nickname: string
}

interface MemberData extends UserData {
  scores: number,
  roundScores: number
}

interface RoomData {
  roomid: string,
  qrCodeUrl: string,
  createdAt: string,

  gameConfig: GameConfig,

  memberDataList: MemberData[],
  actionGroupList: ActionGroup[],

  isGamePlaying: number,
  round: number,

  playerDataList: UserData[],
  dealer: string,
  holdDealer: number,

  nextPlayerDataTuple: [UserData | {}, UserData | {}, UserData | {}, UserData | {}],
  nextBackerDataMap: Record<string, UserData[]>,
  nextDealer: string,

  isRandomBack: boolean
}

interface GameConfig {
  mode: 'addition' | 'multiplication',
  limit: 0 | 4 | 8,
  fiveTriWinConsiderHoldDealer: boolean,
  heavenWinConsiderHoldDealer: boolean
}

interface ActionData {
  actionid: number,
  group: number,

  isUndo: boolean,
  isTemp: false,

  payerData: UserData,
  receiverData: UserData,

  name: ActionName,
  scores: number,
  round: number
}

interface TempActionData {
  actionid: number,
  group: number,

  isUndo: false,
  isTemp: true,

  payerData: UserData,
  receiverData: UserData,

  name: TempActionName,
  scores: number,
  round: number
}

interface ActionGroup {
  mainActionid: number,
  payerList: string[],
  receiverList: string[],

  isNewRound: boolean,
  totalScores: number,

  actionDataList: (ActionData | TempActionData)[]
}

type ActionName = InputActionName | TripletActionName | UndoActionName
type TempActionName = InputActionName | UndoActionName

type InputActionName = BaseActionName | CompoundActionName

type BaseActionName =
  | '碰' | '扫' | '坎'
  | '跑' | '提' | '蛇'
  | '胡' | '地胡' | '天胡'
  | '七对' | '双龙' | '臭庄'
  | '支出分值'

type CompoundActionName = '碰胡' | '扫胡' | '跑胡' | '提龙连胡'

type TripletActionName =
  | '碰三大' | '扫三大' | '坎三大' | '碰三大连胡' | '扫三大连胡'
  | '碰四清' | '扫四清' | '坎四清' | '碰四清连胡' | '扫四清连胡'
  | '五福'

type UndoActionName =
  | '撤回碰' | '撤回扫' | '撤回坎'
  | '撤回跑' | '撤回提' | '撤回蛇'
  | '撤回碰三大' | '撤回扫三大' | '撤回坎三大'
  | '撤回碰四清' | '撤回扫四清' | '撤回坎四清'
  | '撤回支出分值'

type OperationInput =
  | '碰' | '扫' | '坎'
  | '跑' | '提' | '蛇'
  | '胡' | '臭'
  | '碰胡' | '胡碰' | '扫胡' | '胡扫'
  | '跑胡' | '胡跑' | '提胡' | '胡提'
  | '胡胡' | '坎坎' | '蛇蛇'

type OperationDisplay =
  | '碰' | '扫' | '坎'
  | '跑' | '提' | '蛇'
  | '胡' | '臭庄'
  | '碰胡' | '扫胡' | '跑胡' | '提龙连胡'
  | '天胡' | '地胡' | '七对' | '双龙'

type NumberInput = `${number}`

type KeyboardInput = '' | NumberInput | OperationInput
type KeyboardDisplay = '' | NumberInput | OperationDisplay

interface NoticeData {
  content: string,
  isImportant: boolean,
  createdAt: string,
}

interface CallFunctionResult<T> extends ICloud.CallFunctionResult {
  result: {
    code: number,
    data: T,
    message: string
  }
}

type ImageType = 'avatar' | 'qrCode'
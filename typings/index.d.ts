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
  avatarSrc: string,
  avatarFileID: string,
  nickname: string
}

type ClientDatabaseUserData = Omit<DatabaseUserData, 'createdAt'>

interface MemberData extends UserData {
  scores: number,
  roundScores: number
}

type CachedRoomData = RoomPageCachedRoomData & InformationPageCachedRoomData

interface RoomPageCachedRoomData {
  roomid: string,

  memberList: string[],
  actionGroupList: CachedActionGroup[],
  scoresMap: Record<string, number>,

  isGamePlaying: number,
  round: number,

  playerList: string[],
  dealer: string,
  holdDealer: number,

  roundScoresMap: Record<string, number>,

  nextPlayerTuple: [string, string, string, string],
  nextDealer: string
}

interface InformationPageCachedRoomData {
  roomid: string,
  qrCodeSrc: string,
  qrCodeFileID: string,
  createdAt: string,

  gameConfig: GameConfig,

  memberList: string[],

  isGamePlaying: number,

  nextPlayerTuple: [string, string, string, string],
  nextBackerMap: Record<string, string[]>,
  nextDealer: string,

  isRandomBack: boolean
}

interface HistoryData {
  roomid: string,
  createdAt: string,
  settledAt: string,

  gameConfig: GameConfig,

  memberDataList: UserData[],
  scoresMap: Record<string, number>,
  
  round: number
}

type ClientDatabaseHistoryData = Omit<DatabaseHistoryData, 'createBy' | 'actionDataList'>

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

  payerData: UserData,
  receiverData: UserData,

  name: ActionName,
  scores: number,
  round: number
}

interface CachedActionData extends Omit<ActionData, 'payerData' | 'receiverData'> {
  payer: string,
  receiver: string
}

interface TempActionData extends ActionData {
  isUndo: false,

  name: TempActionName,
  scores: 0
}

interface ActionGroup {
  group: number,
  payerList: string[],
  receiverList: string[],

  isUndo: boolean,
  isTemp: false,
  isNewRound: boolean,
  totalScores: number,

  actionDataList: ActionData[]
}

interface CachedActionGroup extends Omit<ActionGroup, 'actionDataList'> {
  actionDataList: CachedActionData[]
}

interface TempActionGroup {
  group: number,
  payerList: string[],
  receiverList: string[],

  isUndo: false,
  isTemp: true,
  isNewRound: false,
  totalScores: 0,

  actionDataList: TempActionData[]
}

type ActionName = BaseActionName | CompoundActionName | TripletActionName | UndoActionName
type TempActionName = BaseActionName | CompoundActionName | UndoActionName

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

type UndoActionName = `撤回${ BaseActionName | CompoundActionName | TripletActionName }`

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
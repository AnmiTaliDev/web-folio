import search from '@material-symbols/svg-400/rounded/search.svg?raw'
import close from '@material-symbols/svg-400/rounded/close.svg?raw'
import thumbup from '@material-symbols/svg-400/rounded/thumb_up.svg?raw'
import thumbdown from '@material-symbols/svg-400/rounded/thumb_down.svg?raw'
import bookmark from '@material-symbols/svg-400/rounded/bookmark.svg?raw'
import chatbubble from '@material-symbols/svg-400/rounded/chat_bubble.svg?raw'
import home from '@material-symbols/svg-400/rounded/home.svg?raw'
import person from '@material-symbols/svg-400/rounded/person.svg?raw'
import settings from '@material-symbols/svg-400/rounded/settings.svg?raw'
import arrowback from '@material-symbols/svg-400/rounded/arrow_back.svg?raw'
import send from '@material-symbols/svg-400/rounded/send.svg?raw'
import add from '@material-symbols/svg-400/rounded/add.svg?raw'
import lock from '@material-symbols/svg-400/rounded/lock.svg?raw'
import check from '@material-symbols/svg-400/rounded/check.svg?raw'
import logout from '@material-symbols/svg-400/rounded/logout.svg?raw'
import deleteIcon from '@material-symbols/svg-400/rounded/delete.svg?raw'
import key from '@material-symbols/svg-400/rounded/key.svg?raw'
import contentcopy from '@material-symbols/svg-400/rounded/content_copy.svg?raw'
import error from '@material-symbols/svg-400/rounded/error.svg?raw'
import info from '@material-symbols/svg-400/rounded/info.svg?raw'
import shield from '@material-symbols/svg-400/rounded/shield.svg?raw'
import menubook from '@material-symbols/svg-400/rounded/menu_book.svg?raw'
import visibilityoff from '@material-symbols/svg-400/rounded/visibility_off.svg?raw'
import refresh from '@material-symbols/svg-400/rounded/refresh.svg?raw'
import locallibrary from '@material-symbols/svg-400/rounded/local_library.svg?raw'
import lockperson from '@material-symbols/svg-400/rounded/lock_person.svg?raw'
import download from '@material-symbols/svg-400/rounded/download.svg?raw'
import bolt from '@material-symbols/svg-400/rounded/bolt.svg?raw'
import psychiatry from '@material-symbols/svg-400/rounded/psychiatry.svg?raw'
import thumbupFill from '@material-symbols/svg-400/rounded/thumb_up-fill.svg?raw'
import thumbdownFill from '@material-symbols/svg-400/rounded/thumb_down-fill.svg?raw'
import bookmarkFill from '@material-symbols/svg-400/rounded/bookmark-fill.svg?raw'
import chatbubbleFill from '@material-symbols/svg-400/rounded/chat_bubble-fill.svg?raw'
import homeFill from '@material-symbols/svg-400/rounded/home-fill.svg?raw'
import personFill from '@material-symbols/svg-400/rounded/person-fill.svg?raw'
import settingsFill from '@material-symbols/svg-400/rounded/settings-fill.svg?raw'
import boltFill from '@material-symbols/svg-400/rounded/bolt-fill.svg?raw'

export const icons = {
  search: search,
  close: close,
  thumb_up: thumbup,
  thumb_down: thumbdown,
  bookmark: bookmark,
  chat_bubble: chatbubble,
  home: home,
  person: person,
  settings: settings,
  arrow_back: arrowback,
  send: send,
  add: add,
  lock: lock,
  check: check,
  logout: logout,
  delete: deleteIcon,
  key: key,
  content_copy: contentcopy,
  error: error,
  info: info,
  shield: shield,
  menu_book: menubook,
  visibility_off: visibilityoff,
  refresh: refresh,
  local_library: locallibrary,
  lock_person: lockperson,
  download: download,
  bolt: bolt,
  psychiatry: psychiatry,
  'thumb_up-fill': thumbupFill,
  'thumb_down-fill': thumbdownFill,
  'bookmark-fill': bookmarkFill,
  'chat_bubble-fill': chatbubbleFill,
  'home-fill': homeFill,
  'person-fill': personFill,
  'settings-fill': settingsFill,
  'bolt-fill': boltFill,
} as const

export type IconName = keyof typeof icons

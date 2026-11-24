import {
  AppleChanOutfit,
  CameraPreset,
  CropId,
  JournalTab,
  Language,
  ProduceId,
  Season,
  TimeMode,
  WeatherKind,
} from './scene/types';

export type SpeechCategory =
  | 'hug'
  | 'water'
  | 'wave'
  | 'goldenApple'
  | 'rushStart'
  | 'rushFinish'
  | 'rushRecord'
  | 'outfitCommon'
  | 'outfitSpring'
  | 'outfitIdol'
  | 'archiveUnlock'
  | 'planted'
  | 'cropHarvest'
  | 'shipped'
  | 'crafted'
  | 'orderComplete'
  | 'lowEnergy'
  | 'ateFruit'
  | 'newDay'
  | 'noSeeds';

export interface ArchiveEntry {
  id: string;
  requiredTrust: number;
  title: string;
  body: string;
  poem?: string;
}

export interface TranslationPack {
  pageTitle: string;
  appTitle: string;
  signLine1: string;
  signLine2: string;
  shopSignLine: string;
  ariaCanvas: string;
  dayLabel: (day: number, season: string) => string;
  seasons: Record<Season, string>;
  goldShort: string;
  energyLabel: string;
  applesLabel: string;
  goldLabel: string;
  trustLabel: string;
  hugsLabel: string;
  journalBtn: string;
  sleepBtn: string;
  rushBtn: string;
  rushActiveBtn: string;
  speakerName: string;
  showControls: string;
  hideControls: string;
  toggleControlsTitle: string;
  hugTreeBtn: string;
  waterBtn: string;
  waveBtn: string;
  plantBtn: string;
  outfits: Record<AppleChanOutfit, string>;
  cameras: Record<CameraPreset, string>;
  times: Record<TimeMode, string>;
  weatherNames: Record<WeatherKind, string>;
  audioMuteTitle: string;
  audioPlayTitle: string;
  inventoryBtn: string;
  inventoryWalletLabel: string;
  inventoryTotalItemsLabel: string;
  inventorySeedsLabel: string;
  accountBtn: string;
  accountTitle: string;
  accountSubtitle: string;
  accountLoginTab: string;
  accountRegisterTab: string;
  accountUsernameLabel: string;
  accountUsernamePlaceholder: string;
  accountPasswordLabel: string;
  accountPasswordPlaceholder: string;
  accountLoginSubmit: string;
  accountRegisterSubmit: string;
  accountSignedInAs: string;
  accountDbFileLabel: string;
  accountLastSaved: string;
  accountSaveNowBtn: string;
  accountSavingLabel: string;
  accountSavedToast: string;
  accountDownloadDbBtn: string;
  accountSignOutBtn: string;
  accountOfflineNotice: string;
  langSwitchTooltip: string;
  guideBtn: string;
  guideTitle: string;
  guideSubtitle: string;
  guideControlsHeading: string;
  guideControlsItems: { keys: string; desc: string }[];
  guideFarmHeading: string;
  guideFarmSteps: string[];
  guideRushHeading: string;
  guideRushDesc: string;
  guideStartBtn: string;
  rushTimeLabel: string;
  rushScoreLabel: string;
  rushComboLabel: string;
  rushBestLabel: string;
  rushBannerHint: string;
  rushResultTitle: string;
  rushNewRecord: string;
  rushApplesCollected: string;
  rushGoldCollected: string;
  rushPlayAgain: string;
  rushBackCozy: string;
  journalTitle: string;
  journalTabs: Record<JournalTab, string>;
  closeBtn: string;
  // Bag & Artisan Crafting tab
  bagProduceTitle: string;
  bagSeedsTitle: string;
  shippingBinTitle: string;
  shippingBinHint: string;
  shippingBinEmpty: string;
  shipOneBtn: string;
  shipAllBtn: string;
  eatBtn: string;
  craftTitle: string;
  craftBtn: string;
  artisanBonusTag: string;
  produceNames: Record<ProduceId, string>;
  cropNames: Record<CropId, string>;
  cropDesc: Record<CropId, string>;
  craftRecipes: {
    ciderDesc: string;
    pieDesc: string;
  };
  // Shop tab
  shopSeedsTitle: string;
  shopUpgradesTitle: string;
  buyBtn: string;
  ownedBtn: string;
  upgrades: {
    copperCan: { name: string; desc: string };
    magnetBasket: { name: string; desc: string };
    artisanKeg: { name: string; desc: string };
  };
  // Orders tab
  ordersTitle: string;
  ordersSubtitle: string;
  requesters: Record<'baker' | 'woodcutter' | 'florist' | 'villager', string>;
  deliverBtn: string;
  completedTag: string;
  rewardLabel: string;
  // Overnight Day Summary (Stardew style!)
  summaryTitle: (day: number, season: string) => string;
  summarySubtitle: string;
  summaryNothingShipped: string;
  summaryCropsGrown: (count: number) => string;
  summaryTotalEarned: string;
  summaryStartNextDay: (nextDay: number) => string;
  // Archive tab
  profileSubtitle: string;
  birthdayLabel: string;
  birthdayValue: string;
  heightLabel: string;
  heightValue: string;
  experienceLabel: string;
  experienceValue: string;
  colorsLabel: string;
  colorsValue: string;
  trustProgressTitle: string;
  trustProgressHint: string;
  lockedArchiveHint: (trust: number) => string;
  watchHugBtn: string;
  archives: ArchiveEntry[];
  quotes: Record<SpeechCategory, string[]>;
}

export const TRANSLATIONS: Record<Language, TranslationPack> = {
  en: {
    pageTitle: "Apple-chan's Orchard – 3D Cozy Voxel Farm Game",
    appTitle: "Apple-chan's Orchard",
    signLine1: "Apple-chan's",
    signLine2: 'Orchard',
    shopSignLine: 'Orchard Shop',
    ariaCanvas: 'Interactive 3D Minecraft-style Apple Orchard cozy farming game featuring Apple-chan',
    dayLabel: (day, season) => `${season} · Day ${day}`,
    seasons: {
      spring: 'Spring',
      summer: 'Summer',
      autumn: 'Autumn',
      winter: 'Winter',
    },
    goldShort: 'G',
    energyLabel: 'Energy',
    applesLabel: 'Apples',
    goldLabel: 'Gold',
    trustLabel: 'Trust',
    hugsLabel: 'Hugs',
    journalBtn: 'Shop & Orders',
    sleepBtn: 'Sleep · Next Day',
    rushBtn: '60s Harvest Rush',
    rushActiveBtn: 'End Rush',
    speakerName: 'Apple-chan',
    showControls: 'Show Controls (H)',
    hideControls: 'Hide Controls (H)',
    toggleControlsTitle: 'Toggle controls (H)',
    hugTreeBtn: 'Hug Apple Tree',
    waterBtn: 'Water Farm Plots',
    waveBtn: 'Wave Hello',
    plantBtn: 'Plant Seed',
    outfits: {
      common: 'Common Outfit',
      spring: 'Spring Overalls',
      idol: 'Idol Outfit',
    },
    cameras: {
      orchard: 'Orchard Overview',
      appleChan: 'Follow Apple-chan',
      cottage: 'Orchard Cottage',
      windmill: 'Hilltop Windmill',
      brook: 'Brook & Gazebo',
    },
    times: {
      realtime: 'Live Local Time',
      morning: 'Sunny Morning',
      sunset: 'Golden Sunset',
      night: 'Starry Night',
    },
    weatherNames: {
      clear: 'Clear',
      cloudy: 'Cloudy',
      rain: 'Rain',
      snow: 'Snow',
      storm: 'Storm',
    },
    audioMuteTitle: 'Mute Orchard Audio',
    audioPlayTitle: 'Play Orchard Audio',
    inventoryBtn: 'Inventory & Wallet',
    inventoryWalletLabel: 'Orchard Wallet',
    inventoryTotalItemsLabel: 'Stored Items',
    inventorySeedsLabel: 'Seed Pouch',
    accountBtn: 'Player Save Account (SQLite)',
    accountTitle: 'Player Orchard Save (SQLite)',
    accountSubtitle: 'Each player gets a dedicated personal SQLite database for progress, inventory, and money.',
    accountLoginTab: 'Sign In',
    accountRegisterTab: 'Create Account',
    accountUsernameLabel: 'Username',
    accountUsernamePlaceholder: '3-24 chars (a-z, 0-9, _ or -)',
    accountPasswordLabel: 'Password',
    accountPasswordPlaceholder: 'At least 6 characters',
    accountLoginSubmit: 'Sign In & Load Save',
    accountRegisterSubmit: 'Create SQLite Save',
    accountSignedInAs: 'Signed in as',
    accountDbFileLabel: 'Personal SQLite File',
    accountLastSaved: 'Last Saved',
    accountSaveNowBtn: 'Save Now',
    accountSavingLabel: 'Saving...',
    accountSavedToast: 'Progress saved to your SQLite database!',
    accountDownloadDbBtn: 'Export .sqlite',
    accountSignOutBtn: 'Sign Out',
    accountOfflineNotice:
      'SQLite save server is not running on this host—progress is currently kept in your browser.',
    langSwitchTooltip: '切换至简体中文',
    guideBtn: 'Orchard Guidebook',
    guideTitle: "Apple-chan's Orchard Guidebook",
    guideSubtitle: 'Welcome! Explore the expanded 3D valley, climb hilltop landmarks, and run your cozy orchard.',
    guideControlsHeading: 'Controls & Exploration',
    guideControlsItems: [
      { keys: 'WASD / Arrows', desc: 'Walk freely—camera auto-follows Apple-chan across the whole valley' },
      { keys: 'Space', desc: 'High jump (>1 block) to climb grassy terraces, Windmill Hill, Waterfall & Gazebo' },
      { keys: 'E', desc: 'Interact with nearby trees, garden plots, shipping bin, shop stall, or cottage door' },
      { keys: 'Click / Drag', desc: 'Click trees, plots, bin, stall, or door; drag to orbit 360° & scroll to zoom' },
      { keys: 'H', desc: 'Hide or show the bottom icon dock anytime' },
    ],
    guideFarmHeading: 'Cozy Orchard Life',
    guideFarmSteps: [
      'Hug apple trees to shake down crisp Red & Golden Apples—walk close to magnet-collect them into your Inventory.',
      'Click the 6 tilled plots in the southeast garden to Plant seeds, Water soil (rain waters them automatically!), and Harvest.',
      'Open the Backpack icon to view your Inventory & Money, craft Cider & Pies, ship produce, or complete Village Orders.',
      'Click the Account icon to register/sign in and persist your orchard to your own personal SQLite database!',
    ],
    guideRushHeading: '60s Golden Harvest Rush',
    guideRushDesc:
      'Click the Trophy icon at the top-right to chase golden-star trees, chain combos, beat your high score, and earn bonus Gold!',
    guideStartBtn: "Got It · Let's Play!",
    rushTimeLabel: 'Time',
    rushScoreLabel: 'Score',
    rushComboLabel: 'Combo',
    rushBestLabel: 'Best',
    rushBannerHint:
      'Hug glowing golden-star trees & gather dropped apples before time runs out!',
    rushResultTitle: 'Golden Harvest Complete!',
    rushNewRecord: 'New High Score!',
    rushApplesCollected: 'Apples Gathered',
    rushGoldCollected: 'Golden Apples',
    rushPlayAgain: 'Play Again',
    rushBackCozy: 'Cozy Mode',
    journalTitle: "Apple-chan's Orchard Journal",
    journalTabs: {
      bag: 'Bag & Craft',
      shop: 'Shop',
      orders: 'Orders',
      archive: 'Archive',
    },
    closeBtn: 'Close',
    bagProduceTitle: 'Harvest Basket',
    bagSeedsTitle: 'Seed Pouch',
    shippingBinTitle: "Today's Shipping Bin",
    shippingBinHint: 'Paid out automatically when you sleep at the cottage!',
    shippingBinEmpty: 'Bin is empty—ship produce or click the wooden bin by the porch.',
    shipOneBtn: 'Ship 1',
    shipAllBtn: 'Ship All',
    eatBtn: 'Eat (+25⚡)',
    craftTitle: 'Orchard Kitchen & Keg',
    craftBtn: 'Craft',
    artisanBonusTag: '+50% Artisan Keg',
    produceNames: {
      redApples: 'Red Apple',
      goldenApples: 'Golden Apple',
      honeyBerries: 'Honeyberry',
      ciderBottles: 'Apple Cider',
      applePies: 'Golden Apple Pie',
    },
    cropNames: {
      honeyBerry: 'Honeyberry Seed',
      appleSapling: 'Crisp Apple Seed',
      goldenSapling: 'Golden Sapling',
    },
    cropDesc: {
      honeyBerry: '1 day · Yields 2 sweet berries',
      appleSapling: '2 days · Yields 3 crisp apples',
      goldenSapling: '2 days · Yields 2 golden apples',
    },
    craftRecipes: {
      ciderDesc: '3 Red Apples → Crisp orchard cider',
      pieDesc: '2 Red + 1 Golden Apple → Warm homemade pie',
    },
    shopSeedsTitle: 'Orchard Seed Stall',
    shopUpgradesTitle: 'Tools & Upgrades',
    buyBtn: 'Buy',
    ownedBtn: 'Owned',
    upgrades: {
      copperCan: {
        name: 'Copper Watering Can',
        desc: 'Waters all 6 farm plots at once with half the energy.',
      },
      magnetBasket: {
        name: 'Woven Magnet Basket',
        desc: 'Wider apple pickup magnet & +1 extra apple per tree hug.',
      },
      artisanKeg: {
        name: 'Oak Artisan Keg',
        desc: '+50% Gold earned from Apple Cider & Golden Apple Pies.',
      },
    },
    ordersTitle: 'Village Notice Board',
    ordersSubtitle: 'Daily villager requests refresh every morning after you sleep.',
    requesters: {
      baker: 'Village Baker',
      woodcutter: 'Old Woodcutter',
      florist: 'Meadow Florist',
      villager: 'Neighborly Villager',
    },
    deliverBtn: 'Deliver',
    completedTag: 'Completed',
    rewardLabel: 'Reward',
    summaryTitle: (day, season) => `${season} · Day ${day} Earnings`,
    summarySubtitle: 'Shipping bin tallied while Apple-chan rested at the cottage.',
    summaryNothingShipped: 'A peaceful rest day—no items shipped in the bin.',
    summaryCropsGrown: (count) =>
      count > 0
        ? `${count} watered garden plot(s) grew overnight!`
        : 'Remember to plant and water seeds in the garden plots!',
    summaryTotalEarned: 'Total Earned',
    summaryStartNextDay: (nextDay) => `Wake Up · Day ${nextDay}`,
    profileSubtitle: 'Original character by 70CentsApple · Orchard Keeper',
    birthdayLabel: 'Birthday',
    birthdayValue: 'August 7',
    heightLabel: 'Height',
    heightValue: '146 cm',
    experienceLabel: 'Tree Planting',
    experienceValue: '5 years',
    colorsLabel: 'Favorite Colors',
    colorsValue: 'Grass Green & Sky Blue',
    trustProgressTitle: 'Orchard Trust',
    trustProgressHint:
      'Hug trees, grow crops, and complete villager orders to unlock all records.',
    lockedArchiveHint: (trust) => `Reach ${trust}% Trust to unlock`,
    watchHugBtn: 'Watch Her Hug a Tree',
    archives: [
      {
        id: 'intro',
        requiredTrust: 0,
        title: 'Basic Profile',
        body: 'Cheerful, independent, and endlessly enthusiastic, Apple-chan reclaimed an overgrown weedy backyard and nurtured it into her own blooming apple orchard. Every tree stands deeply rooted as her family.',
      },
      {
        id: 'file1',
        requiredTrust: 50,
        title: 'Archive File 1 · Starlit Trunk',
        body: 'She rarely speaks of loneliness—instead she insists she can care for every single tree by herself, even though a quiet smile appears whenever someone visits her orchard.',
        poem: '“At the edge of darkness, in the orchard’s heart, leaves rustle, a girl looks up. Starry skies, moonlight sways, leaning on a sturdy trunk, she falls into dream’s embrace.”',
      },
      {
        id: 'file2',
        requiredTrust: 100,
        title: 'Archive File 2 · Village Roots',
        body: 'Years ago her parents left on a distant journey, trusting the gentle villagers to watch over her. Through seasons of sun and snow, Apple-chan grew strong alongside her saplings.',
      },
      {
        id: 'file3',
        requiredTrust: 150,
        title: 'Archive File 3 · Family of Trees',
        body: 'What began as a single sprout in a forgotten patch of weeds became rows of blossoming boughs, a warm timber cottage, and a wooden footbridge over the singing brook.',
      },
      {
        id: 'file4',
        requiredTrust: 200,
        title: 'Archive File 4 · Green & Sky Blue',
        body: '“Green like grass, blue like the sky—my two favorite colors!” Having hugged every single tree in her orchard, she watches the distant hot-air balloon drifting on the breeze and whispers: “Can I hug you?”',
      },
    ],
    quotes: {
      hug: [
        '"Can I... hug you?" *squeezes the apple trunk tightly!*',
        '"Every tree in this orchard is my family!"',
        '"Oops, sorry... I forgot not everyone is as sturdy as an apple tree!"',
        '"Hehe, the leaves rustle happily whenever I give them a big hug!"',
      ],
      water: [
        '"Drink up, little sprouts! Grow tall enough to reach the blue sky!"',
        '"Green like grass, blue like the sky—my two favorite colors!"',
        '"Watered soil looks so cozy—let’s check them tomorrow morning!"',
      ],
      wave: [
        '"Welcome to my orchard! Plant seeds, hug trees, and ship apples at the wooden bin!"',
        '"I can manage the whole orchard myself... though having you help is wonderful!"',
        '"Check the Village Notice Board in the Journal for today’s orders!"',
      ],
      goldenApple: [
        '"Ooh, a sparkling Golden Apple!! That will fetch a great price or bake into a pie!"',
        '"Golden harvest! The orchard is gleaming today!"',
      ],
      rushStart: [
        '"Harvest Rush! Follow the golden stars above the ripe trees and gather every apple!"',
      ],
      rushFinish: [
        '"Phew! What a lively harvest—my basket is overflowing and earned bonus Gold!"',
      ],
      rushRecord: [
        '"Whoa, a brand-new orchard record!! You really know how to harvest!"',
      ],
      outfitCommon: ['"Back in my favorite apple shirt and striped socks!"'],
      outfitSpring: ['"Spring overalls ready! Let’s tend the garden plots!"'],
      outfitIdol: ['"Ta-da! Idol outfit ready—even the apple trees are cheering!"'],
      archiveUnlock: ['"Our orchard trust grew! A new page unlocked in my Field Archive!"'],
      planted: ['"Tucked the seed snugly into the soil! Don’t forget to water it before bed!"'],
      cropHarvest: ['"Fresh from our garden bed! So crisp and fragrant!"'],
      shipped: ['"Popped into the shipping bin! We’ll tally our Gold after sleeping!"'],
      crafted: ['"Mmm, smells delicious! Artisan orchard treats sell for much more!"'],
      orderComplete: ['"Order delivered! The villagers always brighten up over fresh apples!"'],
      lowEnergy: ['"Phew, I’m getting sleepy! Eat a fresh apple or rest at the cottage!"'],
      ateFruit: ['"Crunch! Nothing restores energy faster than orchard-fresh fruit!"'],
      newDay: ['"Good morning! The dew is fresh and the watered garden grew overnight!"'],
      noSeeds: ['"My seed pouch is empty—let’s buy fresh seeds at the Orchard Shop!"'],
    },
  },
  zh: {
    pageTitle: '果酱的苹果园 – 3D 田园体素农场小游戏',
    appTitle: '果酱的苹果园',
    signLine1: '果酱的苹果园',
    signLine2: '田园小栈',
    shopSignLine: '果园小铺',
    ariaCanvas: '果酱的苹果园：3D 我的世界与星露谷风格融合的互动田园网页游戏',
    dayLabel: (day, season) => `${season} · 第${day}天`,
    seasons: {
      spring: '春季',
      summer: '夏季',
      autumn: '秋季',
      winter: '冬季',
    },
    goldShort: 'G',
    energyLabel: '体力',
    applesLabel: '红苹果',
    goldLabel: '金苹果',
    trustLabel: '信赖',
    hugsLabel: '拥抱',
    journalBtn: '小铺与委托',
    sleepBtn: '休息过夜',
    rushBtn: '60秒采摘挑战',
    rushActiveBtn: '结束挑战',
    speakerName: '果酱',
    showControls: '展开控制栏 (H)',
    hideControls: '隐藏控制栏 (H)',
    toggleControlsTitle: '显示/隐藏控制栏 (H)',
    hugTreeBtn: '抱抱苹果树',
    waterBtn: '浇灌田地',
    waveBtn: '打招呼',
    plantBtn: '播种',
    outfits: {
      common: '常服',
      spring: '春服背带裤',
      idol: '偶像服',
    },
    cameras: {
      orchard: '果园全景',
      appleChan: '跟随果酱',
      cottage: '温馨木屋',
      windmill: '山顶风车',
      brook: '小溪与茶亭',
    },
    times: {
      realtime: '实时本地时间',
      morning: '晴朗清晨',
      sunset: '金色黄昏',
      night: '星夜萤火',
    },
    weatherNames: {
      clear: '晴朗',
      cloudy: '多云',
      rain: '细雨',
      snow: '降雪',
      storm: '雷雨',
    },
    audioMuteTitle: '关闭果园风铃音效',
    audioPlayTitle: '开启果园风铃音效',
    inventoryBtn: '果酱的背包与钱包',
    inventoryWalletLabel: '果园钱包',
    inventoryTotalItemsLabel: '背包物品',
    inventorySeedsLabel: '种子口袋',
    accountBtn: '玩家存档账号 (SQLite)',
    accountTitle: '玩家独立存档 (SQLite)',
    accountSubtitle: '每位玩家都拥有独立的个人 SQLite 数据库文件，用于持久化保存物品、金币与农场进度。',
    accountLoginTab: '登录存档',
    accountRegisterTab: '注册新账号',
    accountUsernameLabel: '用户名',
    accountUsernamePlaceholder: '3-24位字母、数字、_ 或 -',
    accountPasswordLabel: '密码',
    accountPasswordPlaceholder: '至少 6 位字符',
    accountLoginSubmit: '登录并读取存档',
    accountRegisterSubmit: '创建个人 SQLite 存档',
    accountSignedInAs: '当前登录玩家',
    accountDbFileLabel: '个人 SQLite 数据库',
    accountLastSaved: '上次保存',
    accountSaveNowBtn: '立即保存',
    accountSavingLabel: '保存中...',
    accountSavedToast: '进度已保存到你的个人 SQLite 数据库！',
    accountDownloadDbBtn: '导出 .sqlite',
    accountSignOutBtn: '退出登录',
    accountOfflineNotice:
      '当前主机未运行 SQLite 后端服务，游戏进度暂存于浏览器本地。',
    langSwitchTooltip: 'Switch to English',
    guideBtn: '游玩指南',
    guideTitle: '果酱的苹果园 · 游玩指南',
    guideSubtitle: '欢迎来到全新的广阔 3D 山谷果园！攀登风车山丘、欣赏实时天色与天气吧。',
    guideControlsHeading: '基础操作',
    guideControlsItems: [
      { keys: 'WASD / 方向键', desc: '自由漫步——移动时镜头会自动居中跟随果酱' },
      { keys: 'Space 空格', desc: '高跳（超过 1 格高），轻松攀登阶梯草坡、山顶风车、瀑布崖与篝火台' },
      { keys: 'E 键', desc: '快捷互动：抱抱附近的苹果树、照料种植田、打开出货箱/小铺或回木屋过夜' },
      { keys: '鼠标点击 / 拖拽', desc: '点击苹果树、田地、出货箱、小铺或木屋门；拖拽360°旋转视角，滚轮缩放' },
      { keys: 'H 键', desc: '随时收起或展开底部图标控制栏' },
    ],
    guideFarmHeading: '田园经营日常',
    guideFarmSteps: [
      '拥抱苹果树可摇落红苹果与金苹果，靠近自动吸入背包。',
      '点击东南角 6 块种植田可播种、浇水（下雨天会自动帮田地浇湿哦！）并采收成熟果实。',
      '点击右上角背包图标查看果酱的物品与金币、酿造苹果酒与黄金苹果派，或放进出货箱卖金币。',
      '点击右上角账号图标注册/登录，即可把你的果园进度持久化到个人专属 SQLite 数据库！',
    ],
    guideRushHeading: '60 秒黄金采摘挑战',
    guideRushDesc:
      '点击右上角奖杯图标即可开启限时挑战，追逐闪耀金星的丰收树叠加连击、赚取丰收奖金！',
    guideStartBtn: '明白啦，开始游玩！',
    rushTimeLabel: '倒计时',
    rushScoreLabel: '得分',
    rushComboLabel: '连击',
    rushBestLabel: '最高分',
    rushBannerHint: '快去拥抱头顶闪耀金星的丰收树，拾取掉落的红苹果与金苹果！',
    rushResultTitle: '黄金采摘挑战完成！',
    rushNewRecord: '刷新果园最高纪录！',
    rushApplesCollected: '收获苹果',
    rushGoldCollected: '金苹果',
    rushPlayAgain: '再来一局',
    rushBackCozy: '回到悠闲模式',
    journalTitle: '果酱的果园手账',
    journalTabs: {
      bag: '背包手作',
      shop: '果园小铺',
      orders: '每日委托',
      archive: '角色档案',
    },
    closeBtn: '关闭',
    bagProduceTitle: '收获果篮',
    bagSeedsTitle: '种子口袋',
    shippingBinTitle: '今日出货箱',
    shippingBinHint: '回木屋休息过夜后，出货箱里的农产品会自动结算金币！',
    shippingBinEmpty: '出货箱还是空的——可以把果实放进来，或点击木屋旁的木头出货箱。',
    shipOneBtn: '出货×1',
    shipAllBtn: '全部出货',
    eatBtn: '吃1个(+25⚡)',
    craftTitle: '果园手作工坊',
    craftBtn: '制作',
    artisanBonusTag: '酿酒木桶 +50% 售价',
    produceNames: {
      redApples: '脆甜红苹果',
      goldenApples: '闪耀金苹果',
      honeyBerries: '蜜糖浆果',
      ciderBottles: '鲜酿苹果酒',
      applePies: '黄金苹果派',
    },
    cropNames: {
      honeyBerry: '蜜糖浆果种子',
      appleSapling: '脆甜苹果种子',
      goldenSapling: '金苹果幼苗',
    },
    cropDesc: {
      honeyBerry: '1天成熟 · 收获 2 颗蜜糖浆果',
      appleSapling: '2天成熟 · 收获 3 颗脆甜红苹果',
      goldenSapling: '2天成熟 · 收获 2 颗闪耀金苹果',
    },
    craftRecipes: {
      ciderDesc: '3 颗红苹果 → 清甜微醺的鲜酿苹果酒',
      pieDesc: '2 颗红苹果 + 1 颗金苹果 → 香酥温暖的黄金苹果派',
    },
    shopSeedsTitle: '种子摊位',
    shopUpgradesTitle: '农具与工坊升级',
    buyBtn: '购买',
    ownedBtn: '已拥有',
    upgrades: {
      copperCan: {
        name: '铜质洒水壶',
        desc: '一次浇透全部 6 块种植田，且体力消耗减半。',
      },
      magnetBasket: {
        name: '丰收编织大果篮',
        desc: '扩大自动拾取范围，每次抱树额外多掉落 1 颗苹果。',
      },
      artisanKeg: {
        name: '橡木酿酒桶',
        desc: '苹果酒与黄金苹果派的出货售价提升 50%！',
      },
    },
    ordersTitle: '村庄布告栏 · 每日委托',
    ordersSubtitle: '每天清晨都会刷新新的村民订单，完成可获丰厚金币与信赖度。',
    requesters: {
      baker: '镇上的面包师',
      woodcutter: '慈祥的老伐木工',
      florist: '草地花店店主',
      villager: '热心的村民',
    },
    deliverBtn: '交付订单',
    completedTag: '已完成',
    rewardLabel: '报酬',
    summaryTitle: (day, season) => `${season} · 第${day}天 收益结算`,
    summarySubtitle: '果酱在小木屋香甜入睡，出货箱里的收成已全部售出。',
    summaryNothingShipped: '悠闲放松的一天——今天出货箱里没有放入商品。',
    summaryCropsGrown: (count) =>
      count > 0
        ? `昨晚浇过水的 ${count} 块田地悄悄长高了一截！`
        : '记得在东南角的种植田里播下种子并浇水哦！',
    summaryTotalEarned: '今日总收入',
    summaryStartNextDay: (nextDay) => `迎接第 ${nextDay} 天清晨`,
    profileSubtitle: '原创角色 by 70CentsApple · 苹果园守护者',
    birthdayLabel: '生日',
    birthdayValue: '8月7日',
    heightLabel: '身高',
    heightValue: '146 cm',
    experienceLabel: '种树经验',
    experienceValue: '5年',
    colorsLabel: '最喜欢的颜色',
    colorsValue: '草绿色 & 天蓝色',
    trustProgressTitle: '果园信赖度',
    trustProgressHint: '抱苹果树、种田收获、完成村民委托都能提升信赖并解锁档案！',
    lockedArchiveHint: (trust) => `信赖度达到 ${trust}% 解锁`,
    watchHugBtn: '看她去抱苹果树',
    archives: [
      {
        id: 'intro',
        requiredTrust: 0,
        title: '基础资料',
        body: '开朗、独立又充满元气的果酱，把后院杂草丛生的荒地一点点开垦成了繁花似锦的苹果园。在她眼里，每一棵深深扎根的苹果树都是无可替代的家人。',
      },
      {
        id: 'file1',
        requiredTrust: 50,
        title: '档案资料一 · 星空与树干',
        body: '嘴上总说“一个人也能照料好整片果园”，但每当有朋友来做客，她眼底藏不住的欢喜总会在微风里悄悄漾开。',
        poem: '“黑暗边缘，果园中央，枝叶沙沙作响，少女仰望天空。星河闪烁，月光轻摇，倚靠着结实的树干，她坠入温柔的梦乡。”',
      },
      {
        id: 'file2',
        requiredTrust: 100,
        title: '档案资料二 · 村庄的守护',
        body: '多年前父母踏上远行，善良的村民们一直温柔照料着年幼的她。在四季流转中，果酱和亲手种下的小树苗一起慢慢长大、变得坚强。',
      },
      {
        id: 'file3',
        requiredTrust: 150,
        title: '档案资料三 · 苹果树之家',
        body: '从杂草地里冒出的第一株嫩芽开始，如今这里已经有了成排挂满果实的大树、冒着炊烟的小木屋，以及跨过潺潺小溪的橡木拱桥。',
      },
      {
        id: 'file4',
        requiredTrust: 200,
        title: '档案资料四 · 草绿与天蓝',
        body: '“草地一样的绿色，天空一样的蓝色——是我最喜欢的两种颜色！”拥抱过果园里每一棵树的少女望着远方飘过天际的热气球，轻声问道：“我可以抱抱你吗？”',
      },
    ],
    quotes: {
      hug: [
        '“我、我可以抱抱你吗？” *紧紧抱住了粗壮的苹果树干！*',
        '“这片果园里的每一棵树，都是我的家人哦！”',
        '“哎呀抱歉……差点忘了不是谁都像苹果树一样结实呢！”',
        '“嘿嘿，每次用力抱住树干，树叶都会开心地沙沙响！”',
      ],
      water: [
        '“多喝点水吧小幼苗！明早醒来就会长大一截哦！”',
        '“草绿色和天蓝色——是我最最喜欢的两种颜色！”',
        '“浇湿的泥土看起来真舒服，期待明天的大丰收！”',
      ],
      wave: [
        '“欢迎来到我的苹果园！可以种田、抱树、把果实放进出货箱卖金币哦！”',
        '“其实我一个人也能管好整片果园……不过有你一起经营真开心！”',
        '“打开右上角的果园手账，看看今天村民们发布了什么委托吧！”',
      ],
      goldenApple: [
        '“哇！是闪闪发光的金苹果！！不管是直接出货还是烤苹果派都超赞！”',
        '“金色大丰收！今天的果园闪闪发亮呢！”',
      ],
      rushStart: [
        '“黄金采摘挑战开始！快去找头顶有金星的丰收树，收获满满金币吧！”',
      ],
      rushFinish: [
        '“呼——真是畅快的大丰收！还赚到了一笔丰收奖金呢！”',
      ],
      rushRecord: [
        '“哇啊啊，刷新果园最高纪录啦！！你简直是采摘大师！”',
      ],
      outfitCommon: ['“换回最舒服的苹果图案常服和条纹袜啦！”'],
      outfitSpring: ['“春服背带裤准备就绪！一起去打理种植田吧！”'],
      outfitIdol: ['“锵锵！偶像服闪亮登场——连苹果树都在为我鼓掌呢！”'],
      archiveUnlock: ['“和果园的信赖度提升了！快打开果园手账看看新解锁的故事吧！”'],
      planted: ['“把种子轻轻埋进土里啦！睡前别忘了给它浇水哦！”'],
      cropHarvest: ['“亲手种出来的果实熟透啦！又脆又香甜！”'],
      shipped: ['“放进木头出货箱啦！今晚回木屋睡一觉就能结算金币！”'],
      crafted: ['“哇，好香呀！亲手加工的果园特产肯定能卖个好价钱！”'],
      orderComplete: ['“委托交付成功！村民们收到新鲜苹果一定开心极了！”'],
      lowEnergy: ['“呼……有点累啦！吃一颗苹果补充体力，或者回木屋休息过夜吧！”'],
      ateFruit: ['“咔嚓！刚摘下来的果子最能恢复元气啦！”'],
      newDay: ['“早安呀！露水真清新，昨晚浇过水的幼苗都长大啦！”'],
      noSeeds: ['“口袋里没有种子啦——去果园小铺买几包新种子吧！”'],
    },
  },
};

const LANG_STORAGE_KEY = 'applechan_orchard_lang_v1';

export function detectInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  try {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('lang')?.toLowerCase();
    if (q === 'zh' || q === 'zh-cn' || q === 'cn') return 'zh';
    if (q === 'en') return 'en';

    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;

    const navLang = (navigator.language || '').toLowerCase();
    if (navLang.startsWith('zh')) return 'zh';
  } catch {
    // Ignore storage/URL access failures
  }
  return 'en';
}

export function saveLanguagePreference(lang: Language): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.history.replaceState(null, '', url.toString());
  } catch {
    // Ignore history/storage errors in restricted iframe sandboxes
  }
}

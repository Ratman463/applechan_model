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
  unlockNote: string;
  poem?: string;
  paragraphs: string[];
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
  seasonCycleTooltip: string;
  craftingBtn: string;
  craftingTitle: string;
  craftingSubtitle: string;
  craftingClearBtn: string;
  craftingCraftBtn: string;
  craftingEmptyOutput: string;
  craftingRecipesHeading: string;
  craftingIngredientsHeading: string;
  craftingHint: string;
  craftingRecipeNames: {
    cider: string;
    pie: string;
    appleSeed: string;
    goldenSeed: string;
  };
  craftingRecipeDescs: {
    cider: string;
    pie: string;
    appleSeed: string;
    goldenSeed: string;
  };
  insideCottageLabel: string;
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
  basicInfoTitle: string;
  codenameLabel: string;
  codenameValue: string;
  genderLabel: string;
  genderValue: string;
  experienceLabel: string;
  experienceValue: string;
  originLabel: string;
  originValue: string;
  birthdayLabel: string;
  birthdayValue: string;
  heightLabel: string;
  heightValue: string;
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
    seasonCycleTooltip: 'Click to preview seasons (Auto follows your local date)',
    craftingBtn: 'Crafting Table (3×3)',
    craftingTitle: 'Crafting Table',
    craftingSubtitle: 'Place apples in the 3×3 grid or click a recipe below to craft.',
    craftingClearBtn: 'Clear Grid',
    craftingCraftBtn: 'Craft',
    craftingEmptyOutput: 'No Match',
    craftingRecipesHeading: 'Orchard Recipes (Click to Auto-Fill)',
    craftingIngredientsHeading: 'Your Apples (Click to Select, Then Click a Grid Slot)',
    craftingHint: 'Walk inside the Cottage to use the 3D Crafting Table, Bed & Chest!',
    craftingRecipeNames: {
      cider: 'Apple Cider',
      pie: 'Golden Apple Pie',
      appleSeed: 'Crisp Apple Seed',
      goldenSeed: 'Golden Sapling',
    },
    craftingRecipeDescs: {
      cider: '3 Red Apples in a row',
      pie: '2 Red + 1 Golden Apple in a row',
      appleSeed: '1 Red Apple anywhere',
      goldenSeed: '1 Golden Apple anywhere',
    },
    insideCottageLabel: 'Inside Cottage',
    guideBtn: 'Orchard Guidebook',
    guideTitle: "Apple-chan's Orchard Guidebook",
    guideSubtitle: 'Welcome! Explore the seasonal 3D voxel valley, enter your cottage, and craft at the Crafting Table.',
    guideControlsHeading: 'Controls & Exploration',
    guideControlsItems: [
      { keys: 'WASD / Arrows', desc: 'Walk freely—camera auto-follows Apple-chan, even inside your Cottage!' },
      { keys: 'Space', desc: 'High jump (>1 block) to climb grassy/snowy terraces, Windmill Hill & Waterfall' },
      { keys: 'E', desc: 'Interact with nearby trees, garden plots, Crafting Table, Bed, Chest, or Shop' },
      { keys: 'Click / Drag', desc: 'Click trees, plots, interior Crafting Table/Bed/Chest; drag to orbit 360°' },
      { keys: 'H', desc: 'Hide or show the bottom Minecraft hotbar dock anytime' },
    ],
    guideFarmHeading: 'Cozy Orchard Life',
    guideFarmSteps: [
      'Hug apple trees to shake down crisp Red & Golden Apples—walk close to magnet-collect them into your Inventory.',
      'Walk right through the Cottage front door! The roof lifts away so you can use the 3D Crafting Table, Bed, and Chest inside.',
      'Use the Minecraft 3×3 Crafting Table to turn apples into Cider, Golden Pies, or Seeds to plant in the 6 garden plots.',
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
    profileSubtitle: 'Original character by 70CentsApple · Official Character Archive',
    basicInfoTitle: 'Basic · Initially Unlocked',
    codenameLabel: 'Codename',
    codenameValue: 'Apple-chan',
    genderLabel: 'Gender',
    genderValue: 'Female',
    experienceLabel: 'Tree Planting Experience',
    experienceValue: '5 yrs',
    originLabel: 'Place of Origin',
    originValue: 'Unknown',
    birthdayLabel: 'Birthday',
    birthdayValue: 'August 7',
    heightLabel: 'Height',
    heightValue: '146 cm',
    trustProgressTitle: 'Orchard Trust',
    trustProgressHint:
      'Hug trees, grow crops, and complete villager orders to unlock all archive files.',
    lockedArchiveHint: (trust) => `Have at least ${trust}% Trust with Apple-chan`,
    watchHugBtn: 'Watch Her Hug a Tree',
    archives: [
      {
        id: 'profile',
        requiredTrust: 0,
        title: 'Profile',
        unlockNote: 'Initially Unlocked',
        paragraphs: [
          'Apple-chan is a child who was "abandoned". She loves nature, with a magical touch that seems to bring joy to all plants. She especially enjoys planting trees. Though young, she is skilled in various planting techniques and is an independent, self-reliant girl—truly endearing.',
        ],
      },
      {
        id: 'file1',
        requiredTrust: 50,
        title: 'Archive File 1',
        unlockNote: 'Have at least 50% Trust with Apple-chan',
        poem: '"At the edge of darkness, in the orchard\'s heart,\nLeaves rustle, a girl looks up.\nStarry skies, moonlight sways,\nLeaning on a sturdy trunk, she falls into dream\'s embrace."',
        paragraphs: [
          'Truthfully, Apple-chan is an extraordinary child. She maintains endless enthusiasm for everything she pursues. Perhaps due to innate talent, she learns anything incredibly quickly. Thanks to both her efforts and the support of others, she has mastered many skills and can now sustain herself. Her charm makes the villagers naturally want to help her, but even when everyone swarms around her, she sometimes pouts and complains that she can manage on her own (how cute~). Respecting her wishes, everyone learned to step back and reflect.',
        ],
      },
      {
        id: 'file2',
        requiredTrust: 100,
        title: 'Archive File 2',
        unlockNote: 'Have at least 100% Trust with Apple-chan',
        paragraphs: [
          'We may never truly comprehend the inner torment and scars of this girl, whose personality combines both passionate exuberance and deep-seated loneliness. Apple-chan’s origins are shrouded in mystery. It is said her parents embarked on a "never-returning" journey when she was very young. Sounds irresponsible, doesn’t it? But is that the full truth?',
          'Rumor has it that Apple-chan was born during an "ordinary" trip. Her parents, admired for their virtues, attracted suspicion and envy from local dark forces. Knowing their child would be their greatest vulnerability, they foresaw the inevitable targeting she’d face. Thus, their "ordinary" journey became extraordinary, and what happened afterward remains unknown.',
          'When a baby girl was found sleeping under a tree, a letter lay beside her, revealing her parents\' names. The villagers, remembering the contributions of her parents and their farewell party, readily offered help.',
          'Somehow brought back to her parents’ hometown, Apple-chan grew up safe and sound, shielded from deception and social turmoil. She lived in her own little world—both physically and emotionally.',
        ],
      },
      {
        id: 'file3',
        requiredTrust: 150,
        title: 'Archive File 3',
        unlockNote: 'Have at least 150% Trust with Apple-chan',
        paragraphs: [
          'The codename "Apple-chan" is one she gave herself. As previously noted, this little girl had no name. Her parents once had a large backyard garden in the village, which used to be a weedy field—now transformed into an apple orchard, Apple-chan’s paradise. She decided to reclaim and manage the entire garden herself. As the apple trees grew, so did her inner strength.',
          'Every tree now stands tall, deeply rooted in the land. They are her family. It’s no surprise she chose "Apple" as her codename and added the affectionate suffix to become "Apple-chan".',
          'Apples may be the most common fruit, always listed on juice labels as "concentrated apple juice" (?), quietly providing essential nutrients to humanity. Just like apples, Apple-chan is unassuming yet quietly strives to flourish in her own secluded corner of the world.',
        ],
      },
      {
        id: 'file4',
        requiredTrust: 200,
        title: 'Archive File 4',
        unlockNote: 'Have at least 200% Trust with Apple-chan',
        paragraphs: [
          'Still, we cannot ignore Apple-chan’s psychological issues. No matter how perfect the external conditions, she lacks a reliable emotional anchor. Outsiders see her as having an extreme dependency on love—anyone she feels affection for becomes her "lifeline". She clings to them with all her might, refusing to let go.',
          'From her perspective, perhaps her parents were indeed a bit reckless and irresponsible, leaving her alone. Their absence in early childhood led to her distorted emotional development. It’s likely why she always tries to appear strong and independent in front of others.',
          'When asked, Apple-chan once said her favorite colors are green and blue.',
          'Green: the color of grass—no matter how it sways in the storm, it never moves from its roots.',
          'Blue: the hue of the sky—even the humblest grass yearns for the heavens.',
          'Don’t forget that hidden deep in her green eyes is a resilient heart, full of unfathomable "little thoughts".',
        ],
      },
      {
        id: 'promotion',
        requiredTrust: 200,
        title: 'Promotion Record',
        unlockNote: 'Promote Apple-chan to Elite 2 (200% Trust)',
        paragraphs: [
          'Apple-chan really loves hugging—so much that she’s hugged every tree in the orchard. Uncle Milk’s waist, the teacher’s arm, even a stray cat’s belly—she’s hugged them all. And each time, the recipient freezes up, because she hugs so tightly, as if trying to merge into their bones.',
          '"I\'m sorry…" she always says afterward, blushing like a ripe apple, "I forgot not everyone is as sturdy as an apple tree."',
          'Then one day, a new art teacher knelt down and said to her: "You can ask \'Can I hug you?\' first, after which, we can all get our hearts ready."',
          '…',
          'That day, the final apple tree in the orchard bloomed. Colored specks filled the sky above the village. As the hot air balloon landed in the flowering orchard, the first thing Apple-chan did was open her arms—then come to a halt.',
          'A couple stepped off the deck. When she was 7, Apple-chan received a letter from her parents, with a photo attached. She remembered now—the clothes in the photo perfectly matched those of the people in front of her.',
          '"Can I… hug you?" she asked softly. The girl stepped forward and wrapped her arms around her parents. And those parents, embraced tightly, realized that what was often called "too strong" a hug was actually just strong enough to synchronize the beats of three hearts.',
        ],
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
    seasonCycleTooltip: '点击可切换预览四季景观（默认自动同步本地日期）',
    craftingBtn: '工作台合成 (3×3)',
    craftingTitle: '合成工作台',
    craftingSubtitle: '像 Minecraft 一样在 3×3 格子中摆放苹果，或直接点击下方配方一键填充。',
    craftingClearBtn: '清空',
    craftingCraftBtn: '合成',
    craftingEmptyOutput: '无匹配配方',
    craftingRecipesHeading: '果园合成表（点击自动摆放）',
    craftingIngredientsHeading: '背包材料（先点击选择材料，再点击上方 3×3 格子）',
    craftingHint: '直接走近木屋门即可进入室内，使用 3D 工作台、床铺和储物箱！',
    craftingRecipeNames: {
      cider: '鲜酿苹果酒',
      pie: '黄金苹果派',
      appleSeed: '脆甜苹果种子',
      goldenSeed: '金苹果幼苗',
    },
    craftingRecipeDescs: {
      cider: '横向 3 颗红苹果',
      pie: '横向 2 颗红苹果 + 1 颗金苹果',
      appleSeed: '任意格 1 颗红苹果',
      goldenSeed: '任意格 1 颗金苹果',
    },
    insideCottageLabel: '木屋室内',
    guideBtn: '游玩指南',
    guideTitle: '果酱的苹果园 · 游玩指南',
    guideSubtitle: '欢迎来到四季变幻的 3D 体素苹果园！走进木屋使用工作台合成物品吧。',
    guideControlsHeading: '基础操作',
    guideControlsItems: [
      { keys: 'WASD / 方向键', desc: '自由漫步——移动时镜头自动跟随果酱，可直接走进木屋内部' },
      { keys: 'Space 空格', desc: '高跳（超过 1 格高），轻松攀登四季阶梯草坡/雪坡、风车山丘与瀑布崖' },
      { keys: 'E 键', desc: '快捷互动：抱抱苹果树、照料田地、使用室内工作台/床铺/储物箱或小铺' },
      { keys: '鼠标点击 / 拖拽', desc: '点击树、田地、室内工作台/床铺/箱子；拖拽 360° 旋转视角，滚轮缩放' },
      { keys: 'H 键', desc: '随时收起或展开底部快捷栏' },
    ],
    guideFarmHeading: '田园经营日常',
    guideFarmSteps: [
      '拥抱苹果树可摇落红苹果与金苹果，靠近自动吸入背包。',
      '直接走向木屋大门即可推门进入室内！屋顶会自动掀开，可点击室内的工作台、床铺与储物箱。',
      '在 3×3 工作台用苹果合成苹果酒、黄金苹果派，或直接把苹果分解成种子种进 6 块农田！',
      '点击右上角账号图标注册/登录，即可把果园进度持久化到个人专属 SQLite 数据库！',
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
    profileSubtitle: '原创角色 by 七毛钱的苹果 (70CentsApple) · 官方角色档案',
    basicInfoTitle: '基础档案 · 初始开放',
    codenameLabel: '代号',
    codenameValue: '果酱',
    genderLabel: '性别',
    genderValue: '女',
    experienceLabel: '种树经验',
    experienceValue: '5年',
    originLabel: '出身地',
    originValue: '未知',
    birthdayLabel: '生日',
    birthdayValue: '8月7日',
    heightLabel: '身高',
    heightValue: '146cm',
    trustProgressTitle: '果园信赖度',
    trustProgressHint: '抱苹果树、种田收获、完成村民委托都能提升信赖并解锁全部档案！',
    lockedArchiveHint: (trust) => `提升信赖至${trust}%以查看更多信息`,
    watchHugBtn: '看她去抱苹果树',
    archives: [
      {
        id: 'profile',
        requiredTrust: 0,
        title: '客观履历',
        unlockNote: '初始开放',
        paragraphs: [
          '果酱，一个「被抛弃」的孩子。她热爱自然，指尖仿佛有让一切植物开心的能力。果酱尤其喜欢植树，虽然她年纪不大，但是熟练掌握各种种树技巧，是一个独立自主、自力更生的女孩，惹人怜爱。',
        ],
      },
      {
        id: 'file1',
        requiredTrust: 50,
        title: '档案资料1',
        unlockNote: '提升信赖至50%以查看更多信息',
        poem: '「黑暗边缘，果园中央。枝叶沙沙作响，少女抬头望。\n漫天星野，月光婆娑。背靠粗壮树干，倚树入梦乡。」',
        paragraphs: [
          '说实话，果酱真是一个了不起的孩子。她永葆对所追求之事的无尽热情。可能可以被解释为「天赋异禀」，果酱无论学什么都能极快掌握。在各位的帮助同自己的努力下，果酱学会了很多，也有充足能力养活自己。惹人怜爱的果酱使得乡民无不自愿供给她力所能及的帮助，但果酱在众人围着她团团转的时候也曾嘟起嘴，苦恼地表示她自己也能做（超可爱的~）。于是，各位便尊重小女孩的意愿，反思自己，不再插手涉足过深。',
        ],
      },
      {
        id: 'file2',
        requiredTrust: 100,
        title: '档案资料2',
        unlockNote: '提升信赖至100%以查看更多信息',
        paragraphs: [
          '我们恐怕永远无法想象，眼前这个拥有着集热烈奔放与孤僻无度于一体之性格的女孩子，内心里究竟遭受过何等的撕裂与创伤。果酱的出身很神秘。据传，在果酱小的时候，她的父母就踏上了「永不归来」的征途。看起来挺不负责任的，不是吗？但真相果真如此吗？',
          '有流言说，果酱的父母是在一场「普通」的旅行中生下她的。在生下她之前，果酱的父母在暂居地积累了不少美德，也迎来了当地原生黑暗势力的猜疑与嫉妒。他们如何会不清楚这一点？他们深知这个孩子将会是他们最软最软的软肋。把孩子生下来，迎接她的只会是针对、针对与无数的针对。「普通」的旅行开始变得「不普通」，而后面的故事我们无从得知。',
          '当人们发现襁褓中的小女孩在树荫里沉睡时，她的身边躺着一封信，信中指示着这个女孩父母的芳名。老乡们仍铭记着当初果酱父母为故乡所做的巨大贡献，也回忆起当初他们远行时全村人为他们饯别的情景。面对眼前的幼女，乡民们无不主动伸出援手。',
          '不知怎么就被运回故乡的果酱从结果上看当然是十分安全的，她父母的计划也很奏效。没有所谓尔虞我诈波及她的成长，也无各类社交纷争威胁她的生命——她活在自己渺小的一方故土，更活在自己的世界里。',
        ],
      },
      {
        id: 'file3',
        requiredTrust: 150,
        title: '档案资料3',
        unlockNote: '提升信赖至150%以查看更多信息',
        paragraphs: [
          '「果酱」这一昵称是她自己取的，正如我们前文记载，这个小女孩没有名字。她的父母在这个村落的故居有个面积不小的后花园，曾经是杂草丛生的荒地，而现在是一片苹果园，是果酱的乐园。她曾自主决定开荒改造，并亲自打理整个园圃。从小树苗开始，果树生长，果酱的内心也一同成长、顽强。',
          '树林中的每一棵果树如今都坚挺地立于这方土地之上，扎根于土地深处。每一棵果树都是这个小女孩的家人，也难怪她会挑选「苹果」作为自己代号，再加上一个亲和力满分的后缀构成自己的称呼「果酱」（Apple-chan）。',
          '苹果，或许是世间最平凡的水果，无论在什么果汁饮料的配料表里总会赫然印着「浓缩苹果汁」的字样（？），无私地为人类提供着各类营养物质。或许同苹果一样，果酱虽无比平凡，却也愿在阴暗一隅里独善其身。',
        ],
      },
      {
        id: 'file4',
        requiredTrust: 200,
        title: '档案资料4',
        unlockNote: '提升信赖至200%以查看更多信息',
        paragraphs: [
          '但我们仍然不能忽视的是果酱的心理问题。纵使外部条件再完美，其内心仍然缺乏牢靠的依托对象。在外人看来，她有着可怖的「极端恋爱脑」，任何她有好感的对象都会被试作救命稻草，她会不顾一切代价地接近你、贴住你，死命地抓住你不放。',
          '好吧，从她的病态心理视角看，果酱的父母也确实有点儿任性不负责了，不能算没有罪过。幼儿期果酱父母的缺席直接促成了她心灵的畸形发展，或许也正因如此，她在别人面前总是试图表现得坚强而独立。',
          '果酱在面对他人提问时曾袒露说，她最喜欢的颜色是绿色和蓝色。',
          '绿色：草地的颜色，风雨中的小草再摇曳，终不会移动一寸远；',
          '蓝色：苍穹之色彩，虽为草芥一株，也向往追求蓝天。',
          '不要忘了，在绿眸深处种着一颗顽强的心，无时无刻不在激发着你永远猜不透的「小心思」。',
        ],
      },
      {
        id: 'promotion',
        requiredTrust: 200,
        title: '晋升记录',
        unlockNote: '提升至精英阶段2以查看更多信息（200%信赖解锁）',
        paragraphs: [
          '果酱确实太喜欢抱人了，甚至果园中的每一棵树都曾被她热情地拥抱过。还有牛奶叔叔的腰、学校老师的胳膊、甚至流浪猫的肚子……被她抱住的人总会僵住，因为这个孩子用的力气实在太大，像要把自己嵌进对方骨头里。',
          '「对不起，」她每次都会害羞地道歉，脸红得简直就是一个熟透的红苹果，「我忘记不是所有人都和果树一样结实了。」',
          '直到有一天，新来的绘画老师蹲下来对她说：「你可以先问『能抱抱吗』，这样我们都能准备好心跳。」',
          '……',
          '那天，果园里的最后一棵苹果树开花了，村庄上空出现了彩色斑点。当热气球降落在繁花盛开的果园里时，果酱做的第一件事是——张开手臂，然后突然停住。',
          '甲板上下来了一对夫妇。七岁那年，果酱曾经收到过一封来自父母的信，信的最后附着一张照片。她想起来了，照片显示着和眼前的人一样的着装。',
          '「可以……抱抱吗？」她小声问。女孩向前迈步，把父母用手包围。被紧紧搂住的父母发现，这个总被说「太用力」的拥抱，其实刚好能把三颗心的心跳调整成相同的频率。',
        ],
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

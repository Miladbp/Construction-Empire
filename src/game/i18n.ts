import { ConstructionStageId, Language, MaterialKey, WorkerRole } from './types';

export interface Translations {
  title: string;
  subtitle: string;
  startCareer: string;
  continueGame: string;
  sandboxMode: string;
  challengeMode: string;
  controlHint: string;
  cash: string;
  unlimited: string;
  level: string;
  reputation: string;
  progress: string;
  fuel: string;
  refuel: string;
  stage: string;
  stages: Record<ConstructionStageId, { title: string; task: string; action: string }>;
  tabs: {
    build: string;
    materials: string;
    crew: string;
    contracts: string;
  };
  materials: Record<MaterialKey, string>;
  buyPack: string;
  inStock: string;
  needed: string;
  insufficientFunds: string;
  insufficientMaterials: string;
  workers: Record<WorkerRole, { name: string; desc: string }>;
  hire: string;
  hired: string;
  equipmentTitle: string;
  excavatorName: string;
  upgradeHydraulics: string;
  maxLevel: string;
  mixerTruck: string;
  rentMixer: string;
  mixerActive: string;
  contracts: Record<string, { name: string; district: string; desc: string }>;
  activeContract: string;
  startContract: string;
  lockedLevel: string;
  completed: string;
  reward: string;
  cameraModes: {
    orbit: string;
    follow: string;
    iso: string;
  };
  timeModes: {
    day: string;
    dusk: string;
    night: string;
  };
  dockHide: string;
  dockShow: string;
  pauseTitle: string;
  resume: string;
  saveNow: string;
  savedToast: string;
  restartSite: string;
  mainMenu: string;
  victoryTitle: string;
  timeoutTitle: string;
  victorySub: string;
  timeoutSub: string;
  payout: string;
  clearTime: string;
  xpEarned: string;
  nextContract: string;
  playAgain: string;
  rotateHint: string;
  digPrompt: string;
  buildPrompt: string;
  curingNote: string;
  soundOn: string;
  soundOff: string;
  languageLabel: string;
  timeRemaining: string;
  audioLabel: string;
  pauseLabel: string;
  cameraLabel: string;
  lightingLabel: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    title: 'CONSTRUCTION EMPIRE 3D',
    subtitle: 'Heavy Machinery & Building Management Simulator',
    startCareer: 'Start Career',
    continueGame: 'Continue Company',
    sandboxMode: 'Sandbox Mode',
    challengeMode: 'Challenge Mode',
    controlHint: 'WASD Drive Excavator · Space Dig / Build · Q/E Rotate Cab · R Rotate Preview · C Camera · Esc Pause',
    cash: 'Funds',
    unlimited: 'Unlimited',
    level: 'Level',
    reputation: 'Reputation',
    progress: 'Site Progress',
    fuel: 'Fuel',
    refuel: 'Refuel ($150)',
    stage: 'Stage',
    stages: {
      site_prep: {
        title: 'Site Preparation',
        task: 'Clear all 4 debris piles from the marked lot boundary.',
        action: 'Clear Debris',
      },
      excavation: {
        title: 'Excavation',
        task: 'Drive the excavator to the lot and dig all 9 foundation cells (Space or click pit).',
        action: 'Scoop Soil',
      },
      foundation: {
        title: 'Rebar & Formwork',
        task: 'Install 4 reinforced steel cages and timber formwork sections.',
        action: 'Place Formwork',
      },
      concrete: {
        title: 'Pour Concrete',
        task: 'Pour fresh concrete from the mixer truck and cure the foundation slab.',
        action: 'Pour Concrete',
      },
      structure: {
        title: 'Structural Frame',
        task: 'Erect columns, beams, walls, windows, pitched roof, and MEP lines.',
        action: 'Build Structure',
      },
      finishing: {
        title: 'Exterior & Finishing',
        task: 'Apply facade finishes, doors, fixtures, and yard landscaping.',
        action: 'Apply Finish',
      },
      inspection: {
        title: 'Final Inspection',
        task: 'Inspect the completed residence and hand over keys for payment.',
        action: 'Complete & Collect',
      },
    },
    tabs: {
      build: 'Site Tasks',
      materials: 'Supply Depot',
      crew: 'Crew & Fleet',
      contracts: 'Contracts',
    },
    materials: {
      rebar: 'Steel Rebar',
      concrete: 'Ready-Mix Concrete',
      timber: 'Timber & Blocks',
      finishing: 'Finishing Kit',
    },
    buyPack: 'Buy Pack',
    inStock: 'Stock',
    needed: 'Req',
    insufficientFunds: 'Insufficient funds',
    insufficientMaterials: 'Need more materials from Supply Depot',
    workers: {
      laborer: {
        name: 'General Laborer',
        desc: 'Clears debris, carries timber, and speeds up framing & finishing.',
      },
      operator: {
        name: 'Excavator Operator',
        desc: 'Assists excavation speed and lowers excavator fuel burn.',
      },
      concrete_tech: {
        name: 'Concrete Specialist',
        desc: 'Accelerates formwork, concrete pouring, and slab curing.',
      },
    },
    hire: 'Hire',
    hired: 'On Site',
    equipmentTitle: 'Heavy Equipment',
    excavatorName: 'CAT-320 Hydraulic Excavator',
    upgradeHydraulics: 'Upgrade Hydraulics',
    maxLevel: 'Max Tier',
    mixerTruck: 'Concrete Mixer Truck',
    rentMixer: 'Dispatch Mixer ($800)',
    mixerActive: 'On Site Ready',
    contracts: {
      oakridge_bungalow: {
        name: 'Oakridge Bungalow',
        district: 'Maple Residential District',
        desc: 'Single-story modern residence with poured slab foundation and pitched timber roof.',
      },
      harborview_duplex: {
        name: 'Harborview Two-Story Villa',
        district: 'Harbor Residential Heights',
        desc: 'Two-story residential villa with reinforced structural frame and landscaped yard.',
      },
      metro_studio: {
        name: 'Metro Commercial Studio',
        district: 'Midtown Commercial Quarter',
        desc: 'Three-story commercial building with high-capacity concrete core and glass facade.',
      },
    },
    activeContract: 'Active',
    startContract: 'Accept Contract',
    lockedLevel: 'Unlock at Level',
    completed: 'Completed',
    reward: 'Payout',
    cameraModes: {
      orbit: 'Orbit',
      follow: 'Follow',
      iso: 'Isometric',
    },
    timeModes: {
      day: 'Day',
      dusk: 'Dusk',
      night: 'Night',
    },
    dockHide: 'Hide Dock',
    dockShow: 'Show Dock',
    pauseTitle: 'Site Paused',
    resume: 'Resume Work',
    saveNow: 'Save Progress',
    savedToast: 'Company progress saved',
    restartSite: 'Restart Contract',
    mainMenu: 'Title Screen',
    victoryTitle: 'Contract Completed',
    timeoutTitle: 'Deadline Missed',
    victorySub: 'Client inspection passed with flying colors. Payment transferred to company account.',
    timeoutSub: 'The challenge clock ran out before final handover. Retry to optimize your crew and workflow.',
    payout: 'Total Payout',
    clearTime: 'Completion Time',
    xpEarned: 'Company XP',
    nextContract: 'Next Contract',
    playAgain: 'Start New Build',
    rotateHint: 'Press R to rotate placement',
    digPrompt: 'Excavator in digging range — press Space',
    buildPrompt: 'Click highlighted site zone or press Space',
    curingNote: 'Concrete curing in progress...',
    soundOn: 'Sound On',
    soundOff: 'Muted',
    languageLabel: 'فارسی',
    timeRemaining: 'Deadline',
    audioLabel: 'Toggle Audio',
    pauseLabel: 'Pause Game',
    cameraLabel: 'Switch Camera',
    lightingLabel: 'Switch Time of Day',
  },
  fa: {
    title: 'امپراتوری ساخت‌وساز سه‌بعدی',
    subtitle: 'شبیه‌ساز ماشین‌آلات سنگین و مدیریت پیمانکاری',
    startCareer: 'شروع بخش داستانی',
    continueGame: 'ادامه شرکت ذخیره شده',
    sandboxMode: 'حالت آزاد (سندباکس)',
    challengeMode: 'حالت چالشی',
    controlHint: 'WASD حرکت بیل مکانیکی · Space حفاری / ساخت · Q/E چرخش کابین · R چرخش پیش‌نمایش · C دوربین · Esc توقف',
    cash: 'سرمایه',
    unlimited: 'نامحدود',
    level: 'سطح شرکت',
    reputation: 'اعتبار',
    progress: 'پیشرفت پروژه',
    fuel: 'سوخت',
    refuel: 'سوخت‌گیری ($150)',
    stage: 'مرحله',
    stages: {
      site_prep: {
        title: 'آماده‌سازی کارگاه',
        task: 'هر ۴ توده نخاله ساختمانی را از محدوده زمین پاکسازی کنید.',
        action: 'پاکسازی نخاله',
      },
      excavation: {
        title: 'گودبرداری و خاک‌برداری',
        task: 'بیل مکانیکی را به محوطه برانید و ۹ بخش پی را حفاری کنید (Space یا کلیک).',
        action: 'حفاری خاک',
      },
      foundation: {
        title: 'آرماتوربندی و قالب‌بندی',
        task: '۴ بخش قفسه میلگرد و قالب‌بندی چوبی پی را نصب کنید.',
        action: 'نصب قالب و میلگرد',
      },
      concrete: {
        title: 'بتن‌ریزی و عمل‌آوری',
        task: 'با کامیون میکسر بتن‌ریزی پی را انجام دهید و منتظر گیرش بتن بمانید.',
        action: 'بتن‌ریزی پی',
      },
      structure: {
        title: 'اسکلت و سفت‌کاری',
        task: 'ستون‌ها، تیرها، دیوارها، پنجره‌ها، سقف شیب‌دار و تاسیسات را بسازید.',
        action: 'اجرای سازه',
      },
      finishing: {
        title: 'نازک‌کاری و نما',
        task: 'رنگ‌آمیزی نما، درب‌ها، تجهیزات نهایی و محوطه‌سازی را تکمیل کنید.',
        action: 'اجرای نازک‌کاری',
      },
      inspection: {
        title: 'بازرسی نهایی و تحویل',
        task: 'پروژه تکمیل‌شده را تایید کنید و دستمزد قرارداد را دریافت نمایید.',
        action: 'تکمیل و دریافت وجه',
      },
    },
    tabs: {
      build: 'مراحل ساخت',
      materials: 'انبار مصالح',
      crew: 'کارگران و ماشین‌آلات',
      contracts: 'قراردادها',
    },
    materials: {
      rebar: 'میلگرد فولادی',
      concrete: 'بتن آماده',
      timber: 'الوار و بلوک',
      finishing: 'پکیج نازک‌کاری',
    },
    buyPack: 'خرید بسته',
    inStock: 'موجودی',
    needed: 'نیاز',
    insufficientFunds: 'موجودی سرمایه کافی نیست',
    insufficientMaterials: 'مصالح کافی ندارید — از انبار مصالح خرید کنید',
    workers: {
      laborer: {
        name: 'کارگر عمومی',
        desc: 'نخاله‌ها را پاکسازی کرده و سرعت دیوارچینی و نازک‌کاری را بالا می‌برد.',
      },
      operator: {
        name: 'اپراتور بیل مکانیکی',
        desc: 'به سرعت گودبرداری کمک کرده و مصرف سوخت را کاهش می‌دهد.',
      },
      concrete_tech: {
        name: 'متخصص بتن و قالب',
        desc: 'قالب‌بندی، بتن‌ریزی و گیرش بتن را تسریع می‌کند.',
      },
    },
    hire: 'استخدام',
    hired: 'فعال در کارگاه',
    equipmentTitle: 'ماشین‌آلات سنگین',
    excavatorName: 'بیل مکانیکی هیدرولیک CAT-320',
    upgradeHydraulics: 'ارتقای هیدرولیک',
    maxLevel: 'حداکثر سطح',
    mixerTruck: 'کامیون میکسر بتن',
    rentMixer: 'اعزام میکسر ($800)',
    mixerActive: 'آماده در کارگاه',
    contracts: {
      oakridge_bungalow: {
        name: 'ویلای یک‌طبقه اوک‌ریج',
        district: 'منطقه مسکونی میپل',
        desc: 'خانه مسکونی مدرن یک‌طبقه با فونداسیون بتنی و سقف شیب‌دار.',
      },
      harborview_duplex: {
        name: 'ویلای دوبلکس هاربورویو',
        district: 'بلندی‌های مسکونی هاربور',
        desc: 'ساختمان دوطبقه مسکونی با اسکلت بتنی مقاوم و محوطه‌سازی.',
      },
      metro_studio: {
        name: 'ساختمان تجاری مترو',
        district: 'منطقه تجاری میدتائون',
        desc: 'ساختمان سه‌طبقه تجاری با هسته بتنی و نمای شیشه‌ای مدرن.',
      },
    },
    activeContract: 'پروژه فعال',
    startContract: 'پذیرش قرارداد',
    lockedLevel: 'بازگشایی در سطح',
    completed: 'تکمیل شده',
    reward: 'مبلغ قرارداد',
    cameraModes: {
      orbit: 'آزاد',
      follow: 'تعقیب ماشین',
      iso: 'ایزومتریک',
    },
    timeModes: {
      day: 'روز',
      dusk: 'غروب',
      night: 'شب',
    },
    dockHide: 'بستن پنل',
    dockShow: 'باز کردن پنل',
    pauseTitle: 'توقف کارگاه',
    resume: 'ادامه کار',
    saveNow: 'ذخیره پیشرفت',
    savedToast: 'اطلاعات شرکت ذخیره شد',
    restartSite: 'شروع مجدد پروژه',
    mainMenu: 'منوی اصلی',
    victoryTitle: 'قرارداد با موفقیت تکمیل شد',
    timeoutTitle: 'زمان قرارداد به پایان رسید',
    victorySub: 'بازرسی مهندس ناظر تایید شد و مبلغ قرارداد به حساب شرکت واریز گردید.',
    timeoutSub: 'مهلت چالش پیش از تحویل نهایی تمام شد. دوباره تلاش کنید.',
    payout: 'مجموع دریافتی',
    clearTime: 'زمان تکمیل',
    xpEarned: 'امتیاز تجربه',
    nextContract: 'قرارداد بعدی',
    playAgain: 'شروع ساخت جدید',
    rotateHint: 'کلید R برای چرخش پیش‌نمایش',
    digPrompt: 'بیل مکانیکی در محدوده حفاری است — کلید Space را بزنید',
    buildPrompt: 'روی بخش مشخص‌شده کلیک کنید یا Space بزنید',
    curingNote: 'در حال عمل‌آوری و گیرش بتن...',
    soundOn: 'صدا روشن',
    soundOff: 'بی‌صدا',
    languageLabel: 'English',
    timeRemaining: 'مهلت باقی‌مانده',
    audioLabel: 'قطع و وصل صدا',
    pauseLabel: 'توقف بازی',
    cameraLabel: 'تغییر دوربین',
    lightingLabel: 'تغییر زمان روز',
  },
};

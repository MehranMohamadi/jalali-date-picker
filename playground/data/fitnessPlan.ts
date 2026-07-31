export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'adjustment'
export type ExerciseEquipment = 'dumbbell' | 'machine' | 'cable' | 'barbell' | 'bodyweight'

export interface Meal {
  id: string
  slot: MealSlot
  name: string
  amount: string
  calories: number
  protein: number
}

export interface NutritionDay {
  weekday: number
  label: string
  activity: string
  mealIds: string[]
  note?: string
}

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: string
  maxReps: number
  rest: string
  equipment: ExerciseEquipment
  note: string
}

export interface WorkoutDay {
  id: string
  weekday: number
  label: string
  title: string
  targetMuscles: string
  note: string
  exercises: Exercise[]
}

export const meals: Meal[] = [
  {
    id: 'breakfast-a',
    slot: 'breakfast',
    name: '‏صبحانه A؛ تخم‌مرغ و نان',
    amount: '‏۲ تخم‌مرغ کامل، ۳ سفیده، ۷۰ گرم سنگک/بربری، ۱۵۰ گرم ماست کم‌چرب، خیار و گوجه',
    calories: 500,
    protein: 38,
  },
  {
    id: 'breakfast-b',
    slot: 'breakfast',
    name: '‏صبحانه B؛ جو دوسر و وی',
    amount: '‏۶۰ گرم جو دوسر، ۲۵۰ میلی‌لیتر شیر کم‌چرب، ۳۰ گرم وی، ۱۰۰ گرم موز و دارچین',
    calories: 530,
    protein: 40,
  },
  {
    id: 'breakfast-c',
    slot: 'breakfast',
    name: '‏صبحانه C؛ ماست یونانی و جو',
    amount: '‏۳۰۰ گرم ماست یونانی کم‌چرب، ۵۰ گرم جو دوسر، یک میوه و ۱۰ گرم گردو',
    calories: 480,
    protein: 43,
  },
  {
    id: 'breakfast-d',
    slot: 'breakfast',
    name: '‏صبحانه D؛ پنیر و تخم‌مرغ',
    amount: '‏۸۰ گرم پنیر کم‌چرب، ۲ تخم‌مرغ، ۶۰ گرم نان، سبزی خوردن و یک میوه کوچک',
    calories: 510,
    protein: 35,
  },
  {
    id: 'snack-whey',
    slot: 'snack',
    name: '‏میان‌وعده وی و میوه',
    amount: '‏۳۰ گرم پودر وی با آب و یک عدد میوه',
    calories: 215,
    protein: 24,
  },
  {
    id: 'snack-yogurt',
    slot: 'snack',
    name: '‏میان‌وعده ماست یونانی',
    amount: '‏۲۵۰ گرم ماست یونانی با سیب یا توت‌فرنگی و دارچین',
    calories: 240,
    protein: 24,
  },
  {
    id: 'snack-milk',
    slot: 'snack',
    name: '‏میان‌وعده شیر و پنیر',
    amount: '‏۲۵۰ میلی‌لیتر شیر کم‌چرب، ۵۰ گرم پنیر کم‌چرب و یک میوه',
    calories: 300,
    protein: 24,
  },
  {
    id: 'snack-tuna',
    slot: 'snack',
    name: '‏میان‌وعده تن ماهی',
    amount: '‏۱۰۰ گرم تن ماهی آبکش‌شده، ۴۰ گرم نان، خیارشور و سبزیجات',
    calories: 295,
    protein: 29,
  },
  {
    id: 'lunch-chicken',
    slot: 'lunch',
    name: '‏مرغ و برنج',
    amount: '‏۱۸۰ گرم مرغ پخته، ۲۲۰ گرم برنج پخته، سالاد، ۱۵۰ گرم ماست و ۵ گرم روغن زیتون',
    calories: 700,
    protein: 60,
  },
  {
    id: 'lunch-beef',
    slot: 'lunch',
    name: '‏گوشت و برنج',
    amount: '‏۱۷۰ گرم گوشت کم‌چرب پخته، ۱۸۰ گرم برنج پخته و سبزیجات یا سالاد',
    calories: 675,
    protein: 50,
  },
  {
    id: 'lunch-fish',
    slot: 'lunch',
    name: '‏ماهی و سیب‌زمینی',
    amount: '‏۲۰۰ گرم ماهی، ۳۵۰ گرم سیب‌زمینی تنوری/آب‌پز، سالاد و ۱۰۰ گرم ماست',
    calories: 650,
    protein: 52,
  },
  {
    id: 'lunch-lentil',
    slot: 'lunch',
    name: '‏عدسی پروتئینی',
    amount: '‏۳۰۰ گرم عدسی، ۱۲۰ گرم مرغ ریش‌ریش، ۶۰ گرم نان و سبزیجات',
    calories: 655,
    protein: 50,
  },
  {
    id: 'lunch-stew',
    slot: 'lunch',
    name: '‏خورشت کنترل‌شده',
    amount: '‏۲۵۰ گرم خورشت کم‌روغن با گوشت کافی، ۱۸۰ گرم برنج پخته و سالاد بدون سس',
    calories: 700,
    protein: 45,
  },
  {
    id: 'dinner-wrap',
    slot: 'dinner',
    name: '‏رپ مرغ',
    amount: '‏۱۶۰ گرم مرغ، ۷۰ گرم نان لواش/تورتیا، ۸۰ گرم ماست چکیده، کاهو و گوجه',
    calories: 565,
    protein: 50,
  },
  {
    id: 'dinner-tuna',
    slot: 'dinner',
    name: '‏تن ماهی و سیب‌زمینی',
    amount: '‏۱۵۰ گرم تن ماهی آبکش‌شده، ۳۰۰ گرم سیب‌زمینی، سبزیجات و ۱۰۰ گرم ماست',
    calories: 550,
    protein: 45,
  },
  {
    id: 'dinner-omelet',
    slot: 'dinner',
    name: '‏املت پروتئینی',
    amount: '‏۲ تخم‌مرغ کامل، ۴ سفیده، ۶۰ گرم نان، ۳۰ گرم پنیر کم‌چرب، قارچ و گوجه',
    calories: 520,
    protein: 43,
  },
  {
    id: 'dinner-yogurt-chicken',
    slot: 'dinner',
    name: '‏کاسه ماست و مرغ',
    amount: '‏۱۴۰ گرم مرغ، ۲۵۰ گرم ماست یونانی، ۵۰ گرم نان، خیار، شوید و سبزیجات',
    calories: 525,
    protein: 58,
  },
  {
    id: 'dinner-leftover',
    slot: 'dinner',
    name: '‏باقی‌مانده ناهار',
    amount: '‏حدود سه‌چهارم سهم ناهار؛ کربوهیدرات کمتر، پروتئین و سبزیجات کامل',
    calories: 550,
    protein: 45,
  },
  {
    id: 'daily-adjustment',
    slot: 'adjustment',
    name: '‏سهم تنظیم روزانه',
    amount: '‏یک میوه با ۱۰ گرم آجیل، یا کمی نان/برنج اضافه در صورت پایین بودن مجموع روز',
    calories: 175,
    protein: 4,
  },
]

export const nutritionWeek: NutritionDay[] = [
  { weekday: 6, label: '‏شنبه', activity: '‏بالاتنه A', mealIds: ['breakfast-b', 'lunch-chicken', 'snack-whey', 'dinner-tuna', 'daily-adjustment'] },
  { weekday: 0, label: '‏یکشنبه', activity: '‏پایین‌تنه A', mealIds: ['breakfast-a', 'lunch-beef', 'snack-yogurt', 'dinner-wrap', 'daily-adjustment'] },
  { weekday: 1, label: '‏دوشنبه', activity: '‏استراحت', mealIds: ['breakfast-c', 'lunch-fish', 'snack-milk', 'dinner-omelet', 'daily-adjustment'] },
  { weekday: 2, label: '‏سه‌شنبه', activity: '‏بالاتنه B', mealIds: ['breakfast-b', 'lunch-stew', 'snack-whey', 'dinner-yogurt-chicken', 'daily-adjustment'] },
  { weekday: 3, label: '‏چهارشنبه', activity: '‏استراحت', mealIds: ['breakfast-d', 'lunch-lentil', 'snack-yogurt', 'dinner-leftover', 'daily-adjustment'] },
  { weekday: 4, label: '‏پنجشنبه', activity: '‏پایین‌تنه B + بازو', mealIds: ['breakfast-a', 'lunch-chicken', 'snack-whey', 'dinner-wrap', 'daily-adjustment'] },
  { weekday: 5, label: '‏جمعه', activity: '‏استراحت انعطاف‌پذیر', mealIds: ['breakfast-c', 'lunch-beef', 'snack-yogurt', 'dinner-tuna', 'daily-adjustment'], note: '‏یک وعده انعطاف‌پذیر، نه یک روز آزاد؛ پروتئین روزانه حفظ شود.' },
]

export const workouts: WorkoutDay[] = [
  {
    id: 'upper-a',
    weekday: 6,
    label: '‏شنبه',
    title: '‏بالاتنه A',
    targetMuscles: '‏سینه و پشت؛ کشش عمودی و افقی',
    note: '‏۵ دقیقه فعالیت سبک و ۲ تا ۳ ست گرم‌کردنی. اگر زمان کم بود، دو حرکت بازو را سوپرست اجرا کن.',
    exercises: [
      { id: 'db-bench', name: '‏پرس سینه دمبل', sets: 4, reps: '۶–۱۰', maxReps: 10, rest: '۲–۳ دقیقه', equipment: 'dumbbell', note: '‏مسیر دمبل کنترل‌شده و فرم ثابت.' },
      { id: 'lat-pulldown', name: '‏لت سیمکش دست متوسط', sets: 4, reps: '۸–۱۲', maxReps: 12, rest: '۲–۳ دقیقه', equipment: 'cable', note: '‏سینه بالا و آرنج‌ها به سمت پهلو.' },
      { id: 'incline-db', name: '‏بالاسینه دمبل', sets: 3, reps: '۸–۱۲', maxReps: 12, rest: '۲ دقیقه', equipment: 'dumbbell', note: '‏شیب نیمکت حدود ۲۰ تا ۳۰ درجه.' },
      { id: 'seated-row', name: '‏پارویی سیمکش نشسته', sets: 3, reps: '۸–۱۲', maxReps: 12, rest: '۲ دقیقه', equipment: 'cable', note: '‏بدن ثابت و مکث کوتاه در انتهای کشش.' },
      { id: 'lateral-raise', name: '‏نشر جانب دمبل/سیمکش', sets: 3, reps: '۱۲–۲۰', maxReps: 20, rest: '۶۰–۹۰ ثانیه', equipment: 'dumbbell', note: '‏بدون تاب دادن بدن؛ ۱ تا ۲ تکرار ذخیره.' },
      { id: 'rope-pushdown', name: '‏پشت بازو سیمکش طناب', sets: 3, reps: '۱۰–۱۵', maxReps: 15, rest: '۶۰–۹۰ ثانیه', equipment: 'cable', note: '‏آرنج ثابت کنار بدن.' },
      { id: 'alternating-curl', name: '‏جلو بازو دمبل تناوبی', sets: 3, reps: '۱۰–۱۵', maxReps: 15, rest: '۶۰–۹۰ ثانیه', equipment: 'dumbbell', note: '‏دامنه کامل و فاز منفی کنترل‌شده.' },
    ],
  },
  {
    id: 'lower-a',
    weekday: 0,
    label: '‏یکشنبه',
    title: '‏پایین‌تنه A',
    targetMuscles: '‏چهارسر، پشت پا، ساق و میان‌تنه',
    note: '‏داخل و خارج ران در صورت علاقه هر کدام ۲ ست ۱۵ تا ۲۰ تکراری؛ جایگزین حرکات اصلی نشوند.',
    exercises: [
      { id: 'leg-press', name: '‏پرس پا', sets: 4, reps: '۸–۱۲', maxReps: 12, rest: '۲–۳ دقیقه', equipment: 'machine', note: '‏عمق بدون جمع شدن لگن؛ ۶۰ کیلو فقط نقطه مرجع است.' },
      { id: 'rdl', name: '‏ددلیفت رومانیایی دمبل/هالتر', sets: 4, reps: '۸–۱۰', maxReps: 10, rest: '۲–۳ دقیقه', equipment: 'barbell', note: '‏لگن عقب، ستون فقرات خنثی و کشش پشت ران.' },
      { id: 'leg-curl-a', name: '‏پشت پا دستگاه', sets: 3, reps: '۱۰–۱۵', maxReps: 15, rest: '۶۰–۹۰ ثانیه', equipment: 'machine', note: '‏مکث کوتاه در انقباض.' },
      { id: 'leg-extension', name: '‏جلو ران دستگاه', sets: 3, reps: '۱۰–۱۵', maxReps: 15, rest: '۶۰–۹۰ ثانیه', equipment: 'machine', note: '‏کنترل حرکت؛ زانو را با شدت قفل نکن.' },
      { id: 'calf-raise-a', name: '‏ساق پا دستگاه', sets: 4, reps: '۱۲–۲۰', maxReps: 20, rest: '۶۰–۹۰ ثانیه', equipment: 'machine', note: '‏مکث پایین و بالا و دامنه کامل.' },
      { id: 'plank', name: '‏پلانک', sets: 3, reps: '۴۰–۶۰ ثانیه', maxReps: 60, rest: '۶۰ ثانیه', equipment: 'bodyweight', note: '‏شکم و باسن منقبض و کمر خنثی.' },
    ],
  },
  {
    id: 'upper-b',
    weekday: 2,
    label: '‏سه‌شنبه',
    title: '‏بالاتنه B',
    targetMuscles: '‏سرشانه، پشت، سینه و تعادل عضلانی',
    note: '‏حجم پشت کمی بیشتر است. در پایان، ۱۰ تا ۱۵ دقیقه هوازی سبک تا متوسط انجام بده.',
    exercises: [
      { id: 'shoulder-press', name: '‏پرس سرشانه دمبل/دستگاه', sets: 4, reps: '۶–۱۰', maxReps: 10, rest: '۲–۳ دقیقه', equipment: 'dumbbell', note: '‏کمر بیش از حد قوس نگیرد.' },
      { id: 'chest-supported-row', name: '‏پارویی سینه‌تکیه/دستگاه', sets: 4, reps: '۸–۱۲', maxReps: 12, rest: '۲ دقیقه', equipment: 'machine', note: '‏تمرکز روی جمع کردن کتف‌ها.' },
      { id: 'machine-bench', name: '‏پرس سینه دستگاه یا دمبل تخت', sets: 3, reps: '۸–۱۲', maxReps: 12, rest: '۲ دقیقه', equipment: 'machine', note: '‏فشار یکنواخت؛ ناتوانی کامل لازم نیست.' },
      { id: 'neutral-lat', name: '‏لت سیمکش دست خنثی/جمع', sets: 3, reps: '۸–۱۲', maxReps: 12, rest: '۲ دقیقه', equipment: 'cable', note: '‏بدون تاب دادن تنه.' },
      { id: 'face-pull', name: '‏فلای پشت یا فیس‌پول', sets: 3, reps: '۱۲–۲۰', maxReps: 20, rest: '۶۰–۹۰ ثانیه', equipment: 'cable', note: '‏آرنج در مسیر راحت شانه.' },
      { id: 'overhead-triceps', name: '‏پشت بازو بالای سر سیمکش', sets: 3, reps: '۱۰–۱۵', maxReps: 15, rest: '۶۰–۹۰ ثانیه', equipment: 'cable', note: '‏کشش کامل سر بلند پشت بازو.' },
      { id: 'hammer-curl', name: '‏جلو بازو چکشی', sets: 3, reps: '۱۰–۱۵', maxReps: 15, rest: '۶۰–۹۰ ثانیه', equipment: 'dumbbell', note: '‏مچ خنثی و آرنج ثابت.' },
    ],
  },
  {
    id: 'lower-b',
    weekday: 4,
    label: '‏پنجشنبه',
    title: '‏پایین‌تنه B + بازو',
    targetMuscles: '‏پا، باسن، میان‌تنه و تأکید تکمیلی بازو',
    note: '‏اگر بلغاری برای تعادل یا زانو مناسب نبود، لانج معکوس، پرس پای تک‌پا یا استپ‌آپ را جایگزین کن.',
    exercises: [
      { id: 'hack-squat', name: '‏هاک اسکوات یا اسکوات دستگاه', sets: 4, reps: '۶–۱۰', maxReps: 10, rest: '۲–۳ دقیقه', equipment: 'machine', note: '‏عمق قابل‌کنترل و مسیر ثابت زانو.' },
      { id: 'bulgarian-split', name: '‏اسپلیت اسکوات بلغاری', sets: 3, reps: '۸–۱۲ هر پا', maxReps: 12, rest: '۲ دقیقه', equipment: 'dumbbell', note: '‏تعادل، کنترل و فشار روی پای جلو.' },
      { id: 'hip-thrust', name: '‏هیپ تراست دستگاه/هالتر', sets: 3, reps: '۸–۱۲', maxReps: 12, rest: '۲ دقیقه', equipment: 'barbell', note: '‏مکث بالا؛ از قوس بیش از حد کمر پرهیز کن.' },
      { id: 'leg-curl-b', name: '‏پشت پا دستگاه', sets: 3, reps: '۱۰–۱۵', maxReps: 15, rest: '۶۰–۹۰ ثانیه', equipment: 'machine', note: '‏ریتم کنترل‌شده.' },
      { id: 'calf-raise-b', name: '‏ساق پا', sets: 3, reps: '۱۲–۲۰', maxReps: 20, rest: '۶۰–۹۰ ثانیه', equipment: 'machine', note: '‏دامنه کامل.' },
      { id: 'cable-crunch', name: '‏کرانچ سیمکش', sets: 3, reps: '۱۲–۱۵', maxReps: 15, rest: '۶۰–۹۰ ثانیه', equipment: 'cable', note: '‏خم شدن کنترل‌شده ستون فقرات، نه کشیدن با دست.' },
      { id: 'arm-superset', name: '‏سوپرست جلو بازو لاری + پشت بازو سیمکش', sets: 3, reps: '۱۰–۱۵', maxReps: 15, rest: '۶۰–۹۰ ثانیه', equipment: 'cable', note: '‏پس از هر جفت حرکت استراحت کن.' },
    ],
  },
]

export const shoppingList = [
  { title: '‏پروتئین‌ها', items: ['‏مرغ بدون پوست', '‏گوشت کم‌چرب', '‏ماهی و تن ماهی', '‏تخم‌مرغ و سفیده', '‏ماست یونانی و پنیر کم‌چرب', '‏حبوبات'] },
  { title: '‏کربوهیدرات‌ها', items: ['‏برنج', '‏نان سنگک، بربری یا لواش', '‏جو دوسر', '‏سیب‌زمینی', '‏میوه فصل', '‏عدس و لوبیا'] },
  { title: '‏سبزیجات و طعم‌دهنده', items: ['‏خیار و گوجه', '‏کاهو و کلم', '‏سبزی خوردن', '‏قارچ و فلفل دلمه‌ای', '‏ادویه، آبلیمو و سرکه', '‏روغن زیتون اندازه‌گیری‌شده'] },
]

export const mealTiming = [
  { title: '‏پیش از تمرین', text: '‏۶۰ تا ۱۲۰ دقیقه قبل تمرین، کربوهیدرات همراه ۲۵ تا ۴۰ گرم پروتئین مصرف کن.' },
  { title: '‏پس از تمرین', text: '‏در چند ساعت بعد تمرین یک وعده کامل پروتئینی بخور؛ وی فقط برای راحتی است.' },
  { title: '‏جایگزینی', text: '‏گزینه‌های هم‌کالری هر گروه قابل جابه‌جایی‌اند. در روز استراحت، میان‌وعده پرکربوهیدرات را با میوه و لبنیات عوض کن.' },
]

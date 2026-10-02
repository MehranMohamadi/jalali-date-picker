export interface BankNotificationInput {
  packageName: string
  appName?: string
  title?: string
  text?: string
  postTime: number
}

export interface ParsedBankExpense {
  id: string
  sourcePackage: string
  sourceApp: string
  title: string
  amount: number
  category: string
  postTime: number
  rawText: string
}

const expenseWords = ['خرید', 'پرداخت', 'برداشت', 'کسر', 'انتقال', 'هزینه', 'پرید']
const ignoredWords = ['واریز', 'دریافت', 'نشست', 'رمز', 'پویا', 'تایید', 'تأیید', 'otp', 'رمز یکبار مصرف']

const categoryHints: Array<{ category: string; words: string[] }> = [
  { category: 'food', words: ['رستوران', 'کافه', 'غذا', 'سوپرمارکت', 'مارکت'] },
  { category: 'transport', words: ['اسنپ', 'تپسی', 'تاکسی', 'سوخت', 'بنزین', 'مترو'] },
  { category: 'bills', words: ['قبض', 'برق', 'آب', 'گاز', 'شارژ', 'اینترنت', 'همراه'] },
  { category: 'health', words: ['دارو', 'درمان', 'بیمارستان', 'کلینیک', 'پزشک'] },
  { category: 'clothes', words: ['پوشاک', 'لباس', 'کفش'] },
  { category: 'education', words: ['آموزش', 'دوره', 'کتاب', 'دانشگاه'] },
  { category: 'travel', words: ['هتل', 'بلیط', 'سفر', 'پرواز'] },
  { category: 'fun', words: ['سینما', 'بازی', 'تفریح', 'سرگرمی'] },
]

export function parseBankExpenseNotification(input: BankNotificationInput): ParsedBankExpense | null {
  const rawText = [input.title, input.text].filter(Boolean).join(' ').trim()
  const normalizedText = normalizeDigits(rawText)
    .replace(/ي/g, 'ی')
    .replace(/[\u200c\u200d\u200e\u200f\u202a-\u202e]/g, '')
    .toLowerCase()

  if (!normalizedText || ignoredWords.some((word) => normalizedText.includes(word.toLowerCase()))) return null
  if (!expenseWords.some((word) => normalizedText.includes(word))) return null

  const isBlu = isBluBankSource(input.packageName, input.appName)
  const amount = extractAmount(normalizedText, isBlu)
  if (!amount) return null

  return {
    id: createNotificationId(input.packageName, input.postTime, amount, normalizedText),
    sourcePackage: input.packageName,
    sourceApp: input.appName || input.packageName,
    title: buildTitle(rawText),
    amount,
    category: suggestCategory(normalizedText),
    postTime: input.postTime,
    rawText,
  }
}

export function getBankSuggestionAmount(suggestion: Pick<ParsedBankExpense, 'sourcePackage' | 'sourceApp' | 'rawText' | 'postTime' | 'amount'>) {
  if (!isBluBankSource(suggestion.sourcePackage, suggestion.sourceApp)) return suggestion.amount

  const parsed = parseBankExpenseNotification({
    packageName: suggestion.sourcePackage,
    appName: suggestion.sourceApp,
    text: suggestion.rawText,
    postTime: suggestion.postTime,
  })
  return parsed?.amount ?? suggestion.amount
}

function isBluBankSource(packageName: string, appName = '') {
  return /bluebank|blubank|(?:^|[.\s_-])blu(?:$|[.\s_-])|بلو/i.test(`${packageName} ${appName}`)
}

export function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
}

function extractAmount(text: string, isBlu: boolean) {
  const moneyMatches = [...text.matchAll(/(\d[\d,\s٬،.]*)\s*(ریال|﷼|تومان|تومن)?/g)]
  const amounts = moneyMatches
    .map((match) => {
      const value = Number(match[1].replace(/[^\d]/g, ''))
      const amount = match[2] === 'ریال' || match[2] === '﷼' || (isBlu && !match[2]) ? Math.round(value / 10) : value
      return { amount, hasUnit: Boolean(match[2]) }
    })
    .filter(({ amount }) => amount >= 1000)

  if (isBlu) return amounts.find(({ hasUnit }) => hasUnit)?.amount ?? amounts[0]?.amount ?? 0
  return amounts.length ? Math.max(...amounts.map(({ amount }) => amount)) : 0
}

function suggestCategory(text: string) {
  return categoryHints.find((hint) => hint.words.some((word) => text.includes(word)))?.category ?? 'shopping'
}

function buildTitle(rawText: string) {
  const compact = rawText.replace(/\s+/g, ' ').trim()
  return compact.length > 48 ? `${compact.slice(0, 45)}...` : compact || 'هزینه بلو بانک'
}

function createNotificationId(packageName: string, postTime: number, amount: number, text: string) {
  const source = `${packageName}|${postTime}|${amount}|${text.slice(0, 160)}`
  let hash = 5381

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33) ^ source.charCodeAt(index)
  }

  return `bank-${Math.abs(hash >>> 0).toString(36)}`
}

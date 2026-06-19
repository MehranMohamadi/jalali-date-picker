import { defineNuxtPlugin } from 'nuxt/app'
import * as jalali from './utils/jalali'
import { formatJalaliDate } from './utils/format'

export default defineNuxtPlugin(() => ({
  provide: {
    jalali: { ...jalali, formatJalaliDate },
  },
}))
